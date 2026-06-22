# Translation Import Inputs

Use this folder to stage NIV/NKJV/ESV JSON files before import.

## Option A: Per-book files

Place files such as:

- `data-import/niv/Genesis.json`
- `data-import/niv/Exodus.json`
- ...

Then validate and import:

```bash
node tools/validate-translation-data.js --input data-import/niv
node tools/import-translation-data.js --version niv --input data-import/niv --dry-run
node tools/import-translation-data.js --version niv --input data-import/niv
```

## Option B: One merged file

Place one file such as `data-import/niv.json` keyed by book name/slug.

Then validate and import:

```bash
node tools/validate-translation-data.js --source data-import/niv.json
node tools/import-translation-data.js --version niv --source data-import/niv.json --dry-run
node tools/import-translation-data.js --version niv --source data-import/niv.json
```

## Template

Start from `data-import/template-book.json` for per-book shape.
