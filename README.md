<div align="center">

# csv-to-json

**Convert CSV, JSON, and YAML between formats — with type inference, filtering, and schema detection.**

[![License: MIT](https://img.shields.io/badge/License-MIT-0B0A09?style=flat-square&labelColor=0B0A09&color=555)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-0B0A09?style=flat-square&labelColor=0B0A09&color=555)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-0B0A09?style=flat-square&labelColor=0B0A09&color=555)](package.json)

</div>

## Install

```bash
npx github:NickCirv/csv-to-json data.csv
```

Also available as the `c2j` short alias after install.

## Usage

```bash
# CSV → JSON (default)
npx github:NickCirv/csv-to-json data.csv

# CSV → YAML with type inference
npx github:NickCirv/csv-to-json data.csv --format yaml --types --pretty

# JSON or YAML → CSV
npx github:NickCirv/csv-to-json data.json
npx github:NickCirv/csv-to-json data.yaml --format csv

# Pipe from stdin
cat data.csv | npx github:NickCirv/csv-to-json --format yaml

# Inspect inferred schema
npx github:NickCirv/csv-to-json data.csv --schema
```

| Flag | Description |
|---|---|
| `--format <fmt>` | Output format: `json` \| `yaml` \| `csv` (default: `json`) |
| `--from <fmt>` | Input format override: `csv` \| `json` \| `yaml` |
| `--delimiter <char>` | Force CSV delimiter (default: auto-detect `,` `\t` `;` `\|`) |
| `--no-header` | First row is data, not headers (columns named `col0`, `col1`, …) |
| `--types` | Infer numbers, booleans, null, and ISO dates |
| `--pretty` | Pretty-print JSON output |
| `--schema` | Print inferred field schema and exit |
| `--output <file>` | Write output to file instead of stdout |
| `--limit <n>` | Process only the first n data rows |
| `--filter <f>=<v>` | Keep rows where field equals value |
| `--select <f1,f2>` | Keep only these columns |

## What it does

Reads CSV, JSON, or YAML and converts to any of the three formats. CSV input is streamed via `readline` so large files never load fully into memory. Type inference (`--types`) casts string values to numbers, booleans, null, or ISO dates. The built-in YAML serializer and parser use zero external dependencies — no `js-yaml`, nothing.

---

<sub>Zero dependencies · Node ≥18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
