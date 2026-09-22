# csv-to-json — implementation reference

Source revision: `3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3`. This reference records source declarations; it is not a transcript of a successful run.

## Entrypoint and runtime

[package.json](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/package.json) declares `index.js`. Node.js `>=20` and npm.

Executable mapping: `csv-to-json` → `./index.js`, `c2j` → `./index.js`.

## Supported workflow

Format/delimiter selection; filtering and field projection; schema inference; file/stdin input; optional output file.

The YAML parser is limited and CSV handling is not a general spreadsheet engine. Type inference can change identifiers such as leading-zero values; leave it off when exact strings matter.

## Command reference

The commands below use the installed executable name. From the pinned checkout, replace it with the `node` entrypoint shown above. Options and command branches were cross-checked against captured source; examples are not execution transcripts.

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

## Package scripts

| Script | Exact command |
| --- | --- |
| `test` | `node --test` |

## Implementation sources

[index.js](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/index.js).

## Verification boundary

No repository code, tests, network operation, hook installer or migration was executed for this review. Source inspection supports the documented interface; runtime correctness and external-service compatibility remain unverified.
