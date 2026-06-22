/**
 * tools/migrate-bible-data.js
 *
 * Restructures bible-data/ from a flat KJV-only layout to:
 *   bible-data/
 *     kjv/   — 66 per-book JSON files (moved from root)
 *     pv/    — 66 per-book Tamil OV JSON files (split from bible-ta-ov.json)
 *     nkjv/  — stub folder (placeholder for future data)
 *     niv/   — stub folder (placeholder for future data)
 *     esv/   — stub folder (placeholder for future data)
 *
 * Per-book file format (same for all translations):
 *   { "book": "Genesis", "chapters": [{ "chapter": "1", "verses": [{ "verse": "1", "text": "..." }] }] }
 *
 * Usage (from repo root):
 *   node tools/migrate-bible-data.js
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const BIBLE_DATA = path.resolve(__dirname, "..", "bible-data");

/* ──────────────────────────────────────────────────────────────
 * 1.  KJV per-book files already in bible-data/ root
 * ────────────────────────────────────────────────────────────── */
const KJV_BOOK_FILES = [
  "1Chronicles","1Corinthians","1John","1Kings","1Peter","1Samuel",
  "1Thessalonians","1Timothy","2Chronicles","2Corinthians","2John","2Kings",
  "2Peter","2Samuel","2Thessalonians","2Timothy","3John","Acts","Amos",
  "Colossians","Daniel","Deuteronomy","Ecclesiastes","Ephesians","Esther",
  "Exodus","Ezekiel","Ezra","Galatians","Genesis","Habakkuk","Haggai",
  "Hebrews","Hosea","Isaiah","James","Jeremiah","Job","Joel","John","Jonah",
  "Joshua","Jude","Judges","Lamentations","Leviticus","Luke","Malachi","Mark",
  "Matthew","Micah","Nahum","Nehemiah","Numbers","Obadiah","Philemon",
  "Philippians","Proverbs","Psalms","Revelation","Romans","Ruth",
  "SongofSolomon","Titus","Zechariah","Zephaniah"
];

/* ──────────────────────────────────────────────────────────────
 * 2.  Tamil (PV) book-name → English filename mapping
 *     Keys must exactly match the top-level keys in bible-ta-ov.json
 * ────────────────────────────────────────────────────────────── */
const TAMIL_TO_FILE = {
  // Old Testament
  "ஆதியாகமம்":               "Genesis",
  "யாத்திராகமம்":             "Exodus",
  "லேவியராகமம்":             "Leviticus",
  "எண்ணாகமம்":               "Numbers",
  "உபாகமம்":                 "Deuteronomy",
  "யோசுவா":                  "Joshua",
  "நியாயாதிபதிகள்":          "Judges",
  "ரூத்":                    "Ruth",
  "1 சாமுவேல்":              "1Samuel",
  "2 சாமுவேல்":              "2Samuel",
  "1 இராஜாக்கள்":            "1Kings",
  "2 இராஜாக்கள்":            "2Kings",
  "1 நாளாகமம்":              "1Chronicles",
  "2 நாளாகமம்":              "2Chronicles",
  "எஸ்றா":                   "Ezra",
  "நெகேமியா":                "Nehemiah",
  "எஸ்தர்":                  "Esther",
  "யோபு":                    "Job",
  "சங்கீதம்":                "Psalms",
  "நீதிமொழிகள்":             "Proverbs",
  "பிரசங்கி":                "Ecclesiastes",
  "உன்னதப்பாட்டு":           "SongofSolomon",
  "ஏசாயா":                   "Isaiah",
  "எரேமியா":                 "Jeremiah",
  "புலம்பல்":                "Lamentations",
  "எசேக்கியேல்":             "Ezekiel",
  "தானியேல்":                "Daniel",
  "ஓசேயா":                   "Hosea",  "ாசியா":                   "Hosea",     // alternate spelling in some OV editions  "யோவேல்":                  "Joel",
  "ஆமோஸ்":                   "Amos",
  "ஒபதியா":                  "Obadiah",
  "யோனா":                    "Jonah",
  "மீகா":                    "Micah",
  "நாகூம்":                  "Nahum",
  "அபகூக்":                  "Habakkuk",
  "ஆபகூக்":                  "Habakkuk",  // alternate spelling in some OV editions
  "செப்பனியா":               "Zephaniah",
  "ஆகாய்":                   "Haggai",
  "சகரியா":                  "Zechariah",
  "மல்கியா":                 "Malachi",
  // New Testament
  "மத்தேயு":                 "Matthew",
  "மாற்கு":                  "Mark",
  "லூக்கா":                  "Luke",
  "லுூக்கா":                 "Luke",
  "யோவான்":                  "John",
  "அப்போஸ்தலருடைய நடபடிகள்": "Acts",
  "ரோமர்":                   "Romans",
  "1 கொரிந்தியர்":           "1Corinthians",
  "2 கொரிந்தியர்":           "2Corinthians",
  "கலாத்தியர்":              "Galatians",
  "எபேசியர்":                "Ephesians",
  "பிலிப்பியர்":             "Philippians",
  "கொலோசெயர்":              "Colossians",
  "1 தெசலோனிக்கேயர்":       "1Thessalonians",
  "2 தெசலோனிக்கேயர்":       "2Thessalonians",
  "1 தீமோத்தேயு":            "1Timothy",
  "2 தீமோத்தேயு":            "2Timothy",
  "தீத்து":                  "Titus",
  "பிலேமோன்":                "Philemon",
  "எபிரெயர்":                "Hebrews",
  "யாக்கோபு":                "James",
  "1 பேதுரு":                "1Peter",
  "2 பேதுரு":                "2Peter",
  "1 யோவான்":                "1John",
  "2 யோவான்":                "2John",
  "3 யோவான்":                "3John",
  "யூதா":                    "Jude",
  "ஓசியா":                   "Hosea",
  "யோவேல்":                  "Joel",
  "வெளிப்படுத்தல்":          "Revelation",
  "வெளிப்படுத்தின விசேஷம்": "Revelation"
};

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log("  created  " + path.relative(process.cwd(), dir));
  }
}

/**
 * Normalise any per-book JSON into the canonical shape:
 *   { book, chapters: [{ chapter, verses: [{ verse, text }] }] }
 *
 * Handles both existing shapes:
 *   A) { book, chapters: [{chapter, verses:[{verse, text}]}] }   ← KJV per-book files
 *   B) { "BookName": { "chNum": { "vNum": "text" } } }            ← Tamil OV flat
 *   C) { "chNum": { "vNum": "text" } }                            ← Tamil OV per-book slice
 */
function toCanonical(raw, englishBookName) {
  // Already canonical
  if (raw && raw.book && Array.isArray(raw.chapters)) {
    return raw;
  }

  // Shape B: top-level key is book name
  const keys = Object.keys(raw);
  const firstVal = raw[keys[0]];

  let chapterSource = raw;
  // If nested one level under a book-name key
  if (typeof firstVal === "object" && !Array.isArray(firstVal)) {
    const firstChapterVal = firstVal[Object.keys(firstVal)[0]];
    if (typeof firstChapterVal === "object" && !Array.isArray(firstChapterVal)) {
      // Shape B — firstVal is the chapters object
      chapterSource = firstVal;
    }
    // else already shape C
  }

  const chapters = Object.keys(chapterSource)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
    .map((chNum) => {
      const verseMap = chapterSource[String(chNum)] || {};
      const verses = Object.keys(verseMap)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
        .map((vNum) => ({ verse: String(vNum), text: String(verseMap[String(vNum)] || "") }));
      return { chapter: String(chNum), verses };
    });

  return { book: englishBookName, chapters };
}

function writeBookFile(destPath, payload) {
  fs.writeFileSync(destPath, JSON.stringify(payload, null, 2), "utf8");
}

function stub(translationKey, englishBookName) {
  return {
    book: englishBookName,
    translation: translationKey,
    status: "placeholder",
    note: "Full data not yet available. Contribute at https://github.com/jvinodraj/ziongospelministry.org",
    chapters: []
  };
}

/* ──────────────────────────────────────────────────────────────
 * Step 1 — create translation subdirectories
 * ────────────────────────────────────────────────────────────── */
console.log("\n[Step 1] Creating translation subdirectories…");
["kjv", "pv", "nkjv", "niv", "esv"].forEach((t) => ensureDir(path.join(BIBLE_DATA, t)));

/* ──────────────────────────────────────────────────────────────
 * Step 2 — copy KJV per-book files to bible-data/kjv/
 * ────────────────────────────────────────────────────────────── */
console.log("\n[Step 2] Copying KJV per-book files → bible-data/kjv/");
let kjvOk = 0, kjvSkip = 0;

KJV_BOOK_FILES.forEach((name) => {
  const src  = path.join(BIBLE_DATA, name + ".json");
  const dest = path.join(BIBLE_DATA, "kjv", name + ".json");

  if (!fs.existsSync(src)) {
    console.warn("  MISSING " + name + ".json — skipped");
    kjvSkip++;
    return;
  }

  // Parse, normalise, write
  const raw = JSON.parse(fs.readFileSync(src, "utf8"));
  const canonical = toCanonical(raw, name);
  writeBookFile(dest, canonical);
  kjvOk++;
});

console.log("  " + kjvOk + " books written, " + kjvSkip + " skipped");

/* ──────────────────────────────────────────────────────────────
 * Step 3 — split bible-ta-ov.json → bible-data/pv/{Book}.json
 * ────────────────────────────────────────────────────────────── */
console.log("\n[Step 3] Splitting bible-ta-ov.json → bible-data/pv/");
const tamilSrc = path.join(BIBLE_DATA, "bible-ta-ov.json");
let pvOk = 0, pvSkip = 0, pvUnmapped = 0;

if (!fs.existsSync(tamilSrc)) {
  console.warn("  MISSING bible-ta-ov.json — PV step skipped");
} else {
  const tamilFull = JSON.parse(fs.readFileSync(tamilSrc, "utf8"));
  const tamilKeys = Object.keys(tamilFull);

  console.log("  Found " + tamilKeys.length + " book keys in bible-ta-ov.json");

  tamilKeys.forEach((tamilName) => {
    const englishFile = TAMIL_TO_FILE[tamilName];
    if (!englishFile) {
      console.warn("  UNMAPPED key: «" + tamilName + "» — skipped");
      pvUnmapped++;
      return;
    }

    const dest = path.join(BIBLE_DATA, "pv", englishFile + ".json");
    if (fs.existsSync(dest)) {
      pvSkip++;
      return;
    }

    // Build per-book slice: { "tamilName": { chNum: { vNum: text } } }
    const bookSlice = {};
    bookSlice[tamilName] = tamilFull[tamilName];

    const canonical = toCanonical(bookSlice, englishFile);
    // Add Tamil book name as metadata
    canonical.localName = tamilName;
    writeBookFile(dest, canonical);
    pvOk++;
  });

  console.log("  " + pvOk + " books written, " + pvSkip + " already existed, " + pvUnmapped + " unmapped");
}

/* ──────────────────────────────────────────────────────────────
 * Step 4 — create stub files for NKJV / NIV / ESV
 * ────────────────────────────────────────────────────────────── */
console.log("\n[Step 4] Creating placeholder stubs for NKJV / NIV / ESV…");
["nkjv", "niv", "esv"].forEach((t) => {
  let stubCount = 0;
  KJV_BOOK_FILES.forEach((name) => {
    const dest = path.join(BIBLE_DATA, t, name + ".json");
    if (!fs.existsSync(dest)) {
      writeBookFile(dest, stub(t, name));
      stubCount++;
    }
  });
  console.log("  " + t.toUpperCase() + ": " + stubCount + " stubs created");
});

/* ──────────────────────────────────────────────────────────────
 * Done
 * ────────────────────────────────────────────────────────────── */
console.log("\n✓ Migration complete.\n");
console.log("New structure:");
console.log("  bible-data/kjv/   ← 66 KJV books");
console.log("  bible-data/pv/    ← 66 Tamil PV books");
console.log("  bible-data/nkjv/  ← 66 placeholder stubs");
console.log("  bible-data/niv/   ← 66 placeholder stubs");
console.log("  bible-data/esv/   ← 66 placeholder stubs");
console.log("\nNext: update the portal to use the new paths, then");
console.log("optionally delete the old flat files from bible-data/\n");
