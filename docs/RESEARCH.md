# csv-to-json — documentation research

Reviewed 21 September 2026. Public GitHub source only.

## Revision and scope

- Commit: [`3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3`](https://github.com/NickCirv/csv-to-json/commit/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3).
- Tree: `090fa23621964d6022de2135baff9a1be9339918`; truncated: `false`.
- Capture: 6 of 6 eligible text files; all eligible text files.
- Method: package and entrypoint inspection, implementation-interface review, targeted behavior/limitation inspection, and test-source review. This is not an exhaustive correctness or security audit.
- Commands run against repository code: **none**. External services, deployment and npm publication were not verified.

## Claim and evidence map

| Documentation claim | Pinned evidence | Assessment |
| --- | --- | --- |
| Runtime, executable and development commands | [package.json](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/package.json) | Source declaration inspected; runtime unverified |
| Converts tabular CSV, JSON and a limited YAML subset, with optional selection and type inference. | [index.js](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/index.js) | Implementation interfaces inspected; behavior not executed |
| Format/delimiter selection; filtering and field projection; schema inference; file/stdin input; optional output file. | [index.js](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/index.js) | Source-backed scope, not a test result |
| The YAML parser is limited and CSV handling is not a general spreadsheet engine. Type inference can change identifiers such as leading-zero values; leave it off when exact strings matter. | [index.js](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/index.js) | Material limits documented; service compatibility remains open |
| Existing checks | [test/smoke.test.js](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/test/smoke.test.js) | Test source read; no passing-run claim |

## Documentation inventory and disposition

| Existing document | Decision |
| --- | --- |
| [README.md](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/README.md) | Rewritten with source-specific purpose, direct checkout setup, limitations and verification status. Old section fragments retained where practical. |

Added `docs/REFERENCE.md` for the observed implementation and command surface, and this research record. Protected license and attribution files remain in their original locations without edits. No source or product UI was changed.

## Quality dimensions

| Dimension | Status | Evidence / next step |
| --- | --- | --- |
| Pinned provenance | Verified | Captured commit, tree and per-file hashes recorded below |
| Interface documentation | Partially verified | Source inspection only; run clean-checkout quickstart |
| Runtime behavior | Unverified | No repository execution in this review |
| Test results | Unverified | Existing tests were not run |
| Deployment / package availability | Unverified | No remote publish or live-service check |
| Visual / link checks | Unverified | Portfolio renderer and independent QA are separate from this authoring step |

## Unresolved issues

The YAML parser is limited and CSV handling is not a general spreadsheet engine. Type inference can change identifiers such as leading-zero values; leave it off when exact strings matter.

## Captured source inventory

This lists captured provenance, not a claim that every line received a full audit. Binary/generated/excluded files are outside the eligible text capture.

| File | SHA-256 | Bytes |
| --- | --- | --- |
| [LICENSE](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/LICENSE) | `68729cab364d82364078b08d8580ccfa51dc69c81a7d64e8d8d47a1da6c9349d` | 1072 |
| [README.md](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/README.md) | `41ea188ccbc880db98b7028195de2fa5061422a3203914a355344191d54c5102` | 2339 |
| [package.json](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/package.json) | `943a742a95ebbae6576db8c95c36bec30bee8597c46b4c0cd4f855830bcffa55` | 722 |
| [.github/workflows/ci.yml](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/.github/workflows/ci.yml) | `e818f4e6bd805f798665dbbf04964d02f12fc59dd7f18903ad63d26d374ae3f0` | 380 |
| [index.js](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/index.js) | `62baff2b9d289d91d82f474426144987260ef661714ac7feb69e98f0ad302cc9` | 19878 |
| [test/smoke.test.js](https://github.com/NickCirv/csv-to-json/blob/3ce07cf7a9a0a91ff553387dd06a581ce1eecbe3/test/smoke.test.js) | `31178f9e769b3cc662acbdb5a9984a51a26132adb2f1a6ecf1b6d94cc9470c1f` | 338 |
