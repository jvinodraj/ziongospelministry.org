#!/usr/bin/env node
/*
 * Validate translation JSON source before import.
 *
 * Usage:
 *  node tools/validate-translation-data.js --input data-import/niv
 *  node tools/validate-translation-data.js --source data-import/niv.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BOOKS_META_PATH = path.join(ROOT, "assets", "data", "bible-books.json");

function parseArgs(argv) {
  const args = { input: "", source: "", help: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") args.input = String(argv[++i] || "");
    else if (a === "--source" || a === "-s") args.source = String(argv[++i] || "");
    else if (a === "--help" || a === "-h") args.help = true;
  }

  return args;
}

function printHelp() {
  console.log([
    "Usage:",
    "  node tools/validate-translation-data.js --input <folder>",
    "  node tools/validate-translation-data.js --source <mergedJsonFile>",
    "",
    "Examples:",
    "  node tools/validate-translation-data.js --input data-import/niv",
    "  node tools/validate-translation-data.js --source data-import/niv.json"
  ].join("\n"));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function resolveBookFileCandidates(baseDir, bookMeta) {
  const candidates = [
    bookMeta.file,
    bookMeta.name + ".json",
    bookMeta.name.replace(/\s+/g, "") + ".json",
    bookMeta.slug + ".json"
  ];

  return candidates
    .map((f) => path.join(baseDir, f))
    .filter((p, idx, arr) => arr.indexOf(p) === idx);
}

function mergedBookData(merged, bookMeta) {
  return (
    merged[bookMeta.name] ||
    merged[bookMeta.slug] ||
    merged[bookMeta.file.replace(/\.json$/i, "")] ||
    null
  );
}

function extractChapterContainer(raw, bookName) {
  if (!raw || typeof raw !== "object") return null;

  if (Array.isArray(raw.chapters)) return raw.chapters;
  if (raw[bookName] && typeof raw[bookName] === "object") return raw[bookName];

  const numericKeys = Object.keys(raw).filter((k) => /^\d+$/.test(k));
  if (numericKeys.length) return raw;

  if (raw.chapters && typeof raw.chapters === "object") return raw.chapters;
  return null;
}

function summarizeNumbers(nums, limit) {
  const max = typeof limit === "number" ? limit : 20;
  if (nums.length <= max) return nums.join(", ");
  return nums.slice(0, max).join(", ") + " ... (" + (nums.length - max) + " more)";
}

function validateVerseContinuity(verseNumbers, pathLabel, errors) {
  if (!Array.isArray(verseNumbers) || !verseNumbers.length) return;

  const seen = new Set();
  const duplicates = [];

  verseNumbers.forEach((n) => {
    if (seen.has(n)) duplicates.push(n);
    seen.add(n);
  });

  if (duplicates.length) {
    const uniqueDupes = Array.from(new Set(duplicates)).sort((a, b) => a - b);
    errors.push(pathLabel + ": duplicate verse numbers " + summarizeNumbers(uniqueDupes));
  }

  const maxVerse = Math.max.apply(null, verseNumbers);
  const missing = [];
  for (let v = 1; v <= maxVerse; v++) {
    if (!seen.has(v)) missing.push(v);
  }

  if (missing.length) {
    errors.push(pathLabel + ": missing verse numbers " + summarizeNumbers(missing));
  }
}

function validateVerses(versesRaw, pathLabel, errors) {
  if (Array.isArray(versesRaw)) {
    const verseNumbers = [];

    for (let i = 0; i < versesRaw.length; i++) {
      const entry = versesRaw[i];

      if (typeof entry === "string") {
        if (!entry.trim()) {
          errors.push(pathLabel + ": verse index " + (i + 1) + " has empty text");
        }
        verseNumbers.push(i + 1);
        continue;
      }

      if (!entry || typeof entry !== "object") {
        errors.push(pathLabel + ": verse index " + (i + 1) + " is not an object/string");
        continue;
      }

      const vNum = toInt(entry.verse);
      if (!isPositiveInt(vNum)) {
        errors.push(pathLabel + ": verse index " + (i + 1) + " has invalid verse number");
      } else {
        verseNumbers.push(vNum);
      }

      if (typeof entry.text !== "string" || !entry.text.trim()) {
        errors.push(pathLabel + ": verse " + (vNum || i + 1) + " has empty text");
      }
    }

    validateVerseContinuity(verseNumbers, pathLabel, errors);
    return;
  }

  if (versesRaw && typeof versesRaw === "object") {
    const verseNumbers = [];

    const keys = Object.keys(versesRaw);
    for (const k of keys) {
      const vNum = toInt(k);
      if (!isPositiveInt(vNum)) {
        errors.push(pathLabel + ": verse key " + JSON.stringify(k) + " is invalid");
      } else {
        verseNumbers.push(vNum);
      }
      const text = versesRaw[k];
      if (typeof text !== "string" || !text.trim()) {
        errors.push(pathLabel + ": verse " + k + " has empty text");
      }
    }

    validateVerseContinuity(verseNumbers, pathLabel, errors);
    return;
  }

  errors.push(pathLabel + ": verses must be array or object map");
}

function validateBookRaw(raw, bookMeta, label, errors) {
  const chapterContainer = extractChapterContainer(raw, bookMeta.name);
  if (!chapterContainer) {
    errors.push(label + ": cannot detect chapters container");
    return;
  }

  if (Array.isArray(chapterContainer)) {
    const seen = new Set();

    for (let idx = 0; idx < chapterContainer.length; idx++) {
      const chObj = chapterContainer[idx];
      if (!chObj || typeof chObj !== "object") {
        errors.push(label + ": chapter entry at index " + idx + " is not an object");
        continue;
      }

      const chNum = toInt(chObj.chapter);
      if (!isPositiveInt(chNum)) {
        errors.push(label + ": chapter index " + idx + " has invalid chapter number");
        continue;
      }

      if (chNum > bookMeta.chapters) {
        errors.push(label + ": chapter " + chNum + " exceeds expected max " + bookMeta.chapters);
      }

      if (seen.has(chNum)) {
        errors.push(label + ": duplicate chapter " + chNum);
      }
      seen.add(chNum);

      validateVerses(chObj.verses, label + " > chapter " + chNum, errors);
    }

    return;
  }

  const numericKeys = Object.keys(chapterContainer).filter((k) => /^\d+$/.test(k));
  if (!numericKeys.length) {
    errors.push(label + ": no numeric chapter keys found");
    return;
  }

  for (const k of numericKeys) {
    const chNum = toInt(k);
    if (!isPositiveInt(chNum)) {
      errors.push(label + ": invalid chapter key " + JSON.stringify(k));
      continue;
    }

    if (chNum > bookMeta.chapters) {
      errors.push(label + ": chapter " + chNum + " exceeds expected max " + bookMeta.chapters);
    }

    validateVerses(chapterContainer[k], label + " > chapter " + chNum, errors);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const inputDir = args.input ? path.resolve(ROOT, args.input) : "";
  const sourceFile = args.source ? path.resolve(ROOT, args.source) : "";

  if (!inputDir && !sourceFile) {
    console.error("ERROR: Provide --input <folder> or --source <mergedJsonFile>");
    process.exit(1);
  }

  if (inputDir && !fs.existsSync(inputDir)) {
    console.error("ERROR: Input folder not found:", inputDir);
    process.exit(1);
  }

  if (sourceFile && !fs.existsSync(sourceFile)) {
    console.error("ERROR: Source file not found:", sourceFile);
    process.exit(1);
  }

  const books = readJson(BOOKS_META_PATH);
  if (!Array.isArray(books) || !books.length) {
    console.error("ERROR: Invalid assets/data/bible-books.json");
    process.exit(1);
  }

  let merged = null;
  if (sourceFile) {
    try {
      merged = readJson(sourceFile);
    } catch (e) {
      console.error("ERROR: Could not parse source JSON:", e.message);
      process.exit(1);
    }
  }

  const errors = [];
  const missingBooks = [];
  let checkedBooks = 0;

  for (const bookMeta of books) {
    let raw = null;
    let label = "";

    if (inputDir) {
      const candidates = resolveBookFileCandidates(inputDir, bookMeta);
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          label = path.relative(ROOT, filePath).replace(/\\/g, "/");
          try {
            raw = readJson(filePath);
          } catch (e) {
            errors.push(label + ": invalid JSON - " + e.message);
          }
          break;
        }
      }
    }

    if (!raw && merged) {
      const found = mergedBookData(merged, bookMeta);
      if (found) {
        raw = found;
        label = path.relative(ROOT, sourceFile).replace(/\\/g, "/") + " :: " + bookMeta.name;
      }
    }

    if (!raw) {
      missingBooks.push(bookMeta.name);
      continue;
    }

    checkedBooks++;
    validateBookRaw(raw, bookMeta, label || bookMeta.name, errors);
  }

  console.log("Validation summary");
  console.log("- checked books:", checkedBooks);
  console.log("- missing books:", missingBooks.length);
  console.log("- errors:", errors.length);

  if (missingBooks.length) {
    console.log("\nMissing books:");
    missingBooks.forEach((b) => console.log("- " + b));
  }

  if (errors.length) {
    console.log("\nValidation errors:");
    errors.slice(0, 300).forEach((e) => console.log("- " + e));
    if (errors.length > 300) {
      console.log("- ... " + (errors.length - 300) + " more");
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
