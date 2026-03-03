#!/usr/bin/env node
/**
 * csv-to-json — Convert CSV↔JSON↔YAML with type inference, filtering, schema detection.
 * Zero external dependencies. Built-ins only.
 */

import { createReadStream, readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { extname, resolve } from 'path';
import { argv, stdout, stdin, exit } from 'process';

// ─── CLI HELP ────────────────────────────────────────────────────────────────

const HELP = `
csv-to-json — Convert CSV↔JSON↔YAML with type inference and schema detection.
Zero dependencies. Node 18+.

USAGE
  csv-to-json <input>          Convert file (format inferred from extension)
  csv-to-json                  Read from stdin (use --from to set input format)
  cat file.csv | csv-to-json

OPTIONS
  --format <fmt>       Output format: json | yaml | csv  (default: json)
  --from <fmt>         Input format override: csv | json | yaml
  --delimiter <char>   Force CSV delimiter (default: auto-detect , | \\t ; |)
  --no-header          First row is data, not headers (cols named col0, col1…)
  --types              Enable type inference (numbers, booleans, null, ISO dates)
  --pretty             Pretty-print JSON output (default: compact)
  --schema             Print inferred schema and exit
  --output <file>      Write output to file instead of stdout
  --limit <n>          Only process first n data rows
  --filter <f>=<v>     Filter rows where field equals value
  --select <f1,f2>     Select only these columns (comma-separated)
  --help, -h           Show this help

EXAMPLES
  csv-to-json data.csv
  csv-to-json data.csv --format yaml
  csv-to-json data.csv --types --pretty
  csv-to-json data.csv --schema
  csv-to-json data.csv --filter country=UK --select name,age
  csv-to-json data.json
  csv-to-json data.yaml
  csv-to-json data.json --format csv
  cat data.csv | csv-to-json --format yaml
`;

// ─── ARG PARSER ──────────────────────────────────────────────────────────────

function parseArgs(args) {
  const opts = {
    input: null,
    format: null,
    from: null,
    delimiter: null,
    header: true,
    types: false,
    pretty: false,
    schema: false,
    output: null,
    limit: Infinity,
    filter: null,
    select: null,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') { stdout.write(HELP + '\n'); exit(0); }
    else if (a === '--no-header') opts.header = false;
    else if (a === '--types') opts.types = true;
    else if (a === '--pretty') opts.pretty = true;
    else if (a === '--schema') opts.schema = true;
    else if (a === '--format') opts.format = args[++i];
    else if (a === '--from') opts.from = args[++i];
    else if (a === '--delimiter') opts.delimiter = args[++i];
    else if (a === '--output') opts.output = args[++i];
    else if (a === '--limit') opts.limit = parseInt(args[++i], 10);
    else if (a === '--filter') opts.filter = args[++i];
    else if (a === '--select') opts.select = args[++i].split(',').map(s => s.trim());
    else if (!a.startsWith('-')) opts.input = a;
    else { stderr(`Unknown option: ${a}`); exit(1); }
  }

  return opts;
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function stderr(msg) {
  process.stderr.write(msg + '\n');
}

function detectExtFormat(filepath) {
  const ext = extname(filepath).toLowerCase();
  if (ext === '.csv') return 'csv';
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  return null;
}

// ─── DELIMITER AUTO-DETECT ───────────────────────────────────────────────────

function detectDelimiter(sample) {
  const candidates = [',', '\t', '|', ';'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    // count unquoted occurrences in first line
    let count = 0;
    let inQ = false;
    for (const ch of sample) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (!inQ && ch === d) count++;
    }
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

// ─── CSV PARSER ──────────────────────────────────────────────────────────────

function parseCSVLine(line, delimiter) {
  const fields = [];
  let cur = '';
  let inQ = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i += 2; continue; }
      inQ = !inQ;
    } else if (ch === delimiter && !inQ) {
      fields.push(cur); cur = ''; i++; continue;
    } else {
      cur += ch;
    }
    i++;
  }
  fields.push(cur);
  return fields;
}

function csvToRows(text, delimiter, hasHeader, limit) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!delimiter) delimiter = detectDelimiter(lines[0] || '');

  let headers;
  let dataStart = 0;

  if (hasHeader && lines.length > 0) {
    headers = parseCSVLine(lines[0], delimiter);
    dataStart = 1;
  }

  const rows = [];
  const count = Math.min(lines.length - dataStart, limit);

  for (let i = 0; i < count; i++) {
    const fields = parseCSVLine(lines[dataStart + i], delimiter);
    if (!headers) {
      // Initialise headers lazily from first data row
      headers = fields.map((_, idx) => `col${idx}`);
    }
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j] !== undefined ? fields[j] : '';
    }
    rows.push(obj);
  }

  return { rows, headers: headers || [] };
}

// ─── TYPE INFERENCE ──────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

function inferValue(v) {
  if (v === '' || v === null || v === undefined || v === 'null' || v === 'NULL' || v === 'N/A') return null;
  if (v === 'true' || v === 'TRUE' || v === 'True') return true;
  if (v === 'false' || v === 'FALSE' || v === 'False') return false;
  if (ISO_DATE_RE.test(v)) return v; // keep as string but validated
  const num = Number(v);
  if (!isNaN(num) && v.trim() !== '') return num;
  return v;
}

function applyTypes(rows) {
  return rows.map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'string' ? inferValue(v) : v;
    }
    return out;
  });
}

// ─── SCHEMA INFERENCE ────────────────────────────────────────────────────────

function inferSchema(rows) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map(k => {
    const values = rows.map(r => r[k]);
    const nonNull = values.filter(v => v !== null && v !== '' && v !== undefined);
    const nullable = nonNull.length < values.length;
    const types = new Set(nonNull.map(v => {
      const n = Number(v);
      if (v === true || v === false) return 'boolean';
      if (!isNaN(n) && String(v).trim() !== '') return 'number';
      if (ISO_DATE_RE.test(String(v))) return 'date';
      return 'string';
    }));
    const samples = nonNull.slice(0, 3);
    return { field: k, types: [...types], nullable, samples };
  });
}

// ─── FILTER & SELECT ─────────────────────────────────────────────────────────

function applyFilter(rows, filterExpr) {
  if (!filterExpr) return rows;
  const idx = filterExpr.indexOf('=');
  if (idx === -1) { stderr('--filter must be field=value'); exit(1); }
  const field = filterExpr.slice(0, idx);
  const value = filterExpr.slice(idx + 1);
  return rows.filter(r => String(r[field]) === value);
}

function applySelect(rows, fields) {
  if (!fields) return rows;
  return rows.map(row => {
    const out = {};
    for (const f of fields) out[f] = row[f];
    return out;
  });
}

// ─── JSON → CSV ──────────────────────────────────────────────────────────────

function rowsToCSV(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = v => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

// ─── MINIMAL YAML SERIALIZER ─────────────────────────────────────────────────

function serializeYAML(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Multi-line or special chars — use literal block scalar
    if (value.includes('\n')) {
      const lines = value.split('\n').map(l => pad + '  ' + l).join('\n');
      return '|-\n' + lines;
    }
    // Quote if contains special YAML chars
    if (/[:#{}\[\],&*?|<>=!%@`]/.test(value) || value.trim() !== value ||
        value === '' || /^(true|false|null|yes|no|on|off)$/i.test(value) ||
        /^\d/.test(value)) {
      return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(v => {
      if (v !== null && typeof v === 'object') {
        const inner = serializeYAML(v, indent + 2);
        return pad + '-\n' + inner;
      }
      return pad + '- ' + serializeYAML(v, indent + 2);
    });
    return items.join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      const safeKey = /[:{}\[\],#&*?|<>=!%@`\s]/.test(k) ? `"${k}"` : k;
      if (v !== null && typeof v === 'object') {
        return pad + safeKey + ':\n' + serializeYAML(v, indent + 2);
      }
      return pad + safeKey + ': ' + serializeYAML(v, indent + 2);
    }).join('\n');
  }
  return String(value);
}

function rowsToYAML(rows) {
  if (rows.length === 0) return '[]\n';
  const lines = rows.map(row => {
    const entries = Object.entries(row);
    const first = entries[0];
    const rest = entries.slice(1);
    let out = '- ';
    if (first) {
      const safeKey = /[:{}\[\],#&*?|<>=!%@`\s]/.test(first[0]) ? `"${first[0]}"` : first[0];
      const val = serializeYAML(first[1], 2);
      out += safeKey + ': ' + val + '\n';
    }
    for (const [k, v] of rest) {
      const safeKey = /[:{}\[\],#&*?|<>=!%@`\s]/.test(k) ? `"${k}"` : k;
      out += '  ' + safeKey + ': ' + serializeYAML(v, 2) + '\n';
    }
    return out;
  });
  return lines.join('');
}

// ─── MINIMAL YAML PARSER ─────────────────────────────────────────────────────

function parseYAML(text) {
  // Support simple YAML arrays of objects (block style, generated by this tool)
  const lines = text.split('\n');
  const items = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ')) {
      if (current !== null) items.push(current);
      current = {};
      const rest = trimmed.slice(2).trim();
      if (rest && rest.includes(': ')) {
        const ci = rest.indexOf(': ');
        const k = rest.slice(0, ci).trim().replace(/^"|"$/g, '');
        const v = rest.slice(ci + 2).trim();
        current[k] = parseYAMLScalar(v);
      }
    } else if (trimmed.startsWith('  ') && current !== null) {
      const inner = trimmed.trim();
      if (inner.includes(': ')) {
        const ci = inner.indexOf(': ');
        const k = inner.slice(0, ci).trim().replace(/^"|"$/g, '');
        const v = inner.slice(ci + 2).trim();
        current[k] = parseYAMLScalar(v);
      }
    }
  }
  if (current !== null) items.push(current);
  return items;
}

function parseYAMLScalar(v) {
  if (v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  const n = Number(v);
  if (!isNaN(n) && v.trim() !== '') return n;
  return v;
}

// ─── STREAMING CSV READER ─────────────────────────────────────────────────────

async function streamCSV(filepath, opts) {
  return new Promise((resolve, reject) => {
    const stream = filepath ? createReadStream(filepath) : stdin;
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    const rows = [];
    let headers = null;
    let lineNum = 0;
    let delimiter = opts.delimiter || null;
    let count = 0;

    rl.on('line', line => {
      if (line.trim() === '') return;
      lineNum++;

      if (!delimiter) delimiter = detectDelimiter(line);

      if (lineNum === 1 && opts.header) {
        headers = parseCSVLine(line, delimiter);
        return;
      }

      if (count >= opts.limit) return;

      const fields = parseCSVLine(line, delimiter);
      if (!headers) {
        headers = fields.map((_, idx) => `col${idx}`);
      }

      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = fields[j] !== undefined ? fields[j] : '';
      }
      rows.push(obj);
      count++;
    });

    rl.on('close', () => resolve({ rows, headers: headers || [] }));
    rl.on('error', reject);
  });
}

// ─── SCHEMA PRINT ────────────────────────────────────────────────────────────

function printSchema(schema) {
  const lines = ['Schema inference:'];
  lines.push('─'.repeat(60));
  for (const f of schema) {
    const typeStr = f.types.join(' | ') || 'unknown';
    const nullStr = f.nullable ? ' (nullable)' : '';
    const sampleStr = f.samples.length > 0
      ? '  samples: ' + f.samples.map(s => JSON.stringify(s)).join(', ')
      : '';
    lines.push(`  ${f.field}: ${typeStr}${nullStr}`);
    if (sampleStr) lines.push(sampleStr);
  }
  lines.push('─'.repeat(60));
  lines.push(`Total fields: ${schema.length}`);
  return lines.join('\n') + '\n';
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const args = argv.slice(2);
  const opts = parseArgs(args);

  // Determine input format
  let inputFormat = opts.from;
  if (!inputFormat && opts.input) {
    inputFormat = detectExtFormat(opts.input) || 'csv';
  } else if (!inputFormat) {
    inputFormat = 'csv'; // default for stdin
  }

  // Determine output format
  let outputFormat = opts.format;
  if (!outputFormat) {
    outputFormat = (inputFormat === 'csv') ? 'json' : 'csv';
  }

  // ── Read input ──────────────────────────────────────────────────────────────
  let rows = [];

  if (inputFormat === 'csv') {
    const result = await streamCSV(opts.input ? resolve(opts.input) : null, opts);
    rows = result.rows;
  } else if (inputFormat === 'json') {
    let text;
    if (opts.input) {
      text = readFileSync(resolve(opts.input), 'utf8');
    } else {
      text = await readStdin();
    }
    const parsed = JSON.parse(text);
    rows = Array.isArray(parsed) ? parsed : [parsed];
    if (opts.limit < Infinity) rows = rows.slice(0, opts.limit);
  } else if (inputFormat === 'yaml') {
    let text;
    if (opts.input) {
      text = readFileSync(resolve(opts.input), 'utf8');
    } else {
      text = await readStdin();
    }
    rows = parseYAML(text);
    if (opts.limit < Infinity) rows = rows.slice(0, opts.limit);
  } else {
    stderr(`Unknown input format: ${inputFormat}`);
    exit(1);
  }

  // ── Apply type inference ─────────────────────────────────────────────────
  if (opts.types) {
    rows = applyTypes(rows);
  }

  // ── Apply filter ─────────────────────────────────────────────────────────
  if (opts.filter) {
    rows = applyFilter(rows, opts.filter);
  }

  // ── Apply select ─────────────────────────────────────────────────────────
  if (opts.select) {
    rows = applySelect(rows, opts.select);
  }

  // ── Schema mode ──────────────────────────────────────────────────────────
  if (opts.schema) {
    const schema = inferSchema(rows);
    const out = printSchema(schema);
    if (opts.output) {
      writeFileSync(resolve(opts.output), out, 'utf8');
    } else {
      stdout.write(out);
    }
    return;
  }

  // ── Serialize output ─────────────────────────────────────────────────────
  let output;
  if (outputFormat === 'json') {
    output = opts.pretty
      ? JSON.stringify(rows, null, 2)
      : JSON.stringify(rows);
  } else if (outputFormat === 'yaml') {
    output = rowsToYAML(rows);
  } else if (outputFormat === 'csv') {
    output = rowsToCSV(rows);
  } else {
    stderr(`Unknown output format: ${outputFormat}`);
    exit(1);
  }

  // ── Write output ─────────────────────────────────────────────────────────
  if (opts.output) {
    writeFileSync(resolve(opts.output), output + (output.endsWith('\n') ? '' : '\n'), 'utf8');
    stderr(`Written to ${opts.output}`);
  } else {
    stdout.write(output + '\n');
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', chunk => { data += chunk; });
    stdin.on('end', () => resolve(data));
    stdin.on('error', reject);
  });
}

main().catch(err => {
  stderr('Error: ' + err.message);
  exit(1);
});
