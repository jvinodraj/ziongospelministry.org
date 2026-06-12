const translationFiles = {
  en: "bible-data/bible-en-kjv.json",
  ta: "bible-data/bible-ta-ov.json"
};

let currentTranslation = "en";
let bibleData = {};  // { book: { chapter: { verse: "text", ... }, ... }, ... }

// TTS state
let currentUtterance = null;
let isSpeaking = false;

// DOM elements will be assigned after DOMContentLoaded to avoid
// "Cannot read properties of null (reading 'addEventListener')" errors
let ttsPlayBtn, ttsStopBtn, ttsStatus;
let translationSelect, bookSelect, chapterSelect, bibleTextDiv, currentRefDiv;
let searchInput, searchButton, searchResultsDiv;
let audioLangSelect, audioFrame;


// ---- TTS Helper Functions ----

function getCurrentChapterText() {
  const book = bookSelect.value;
  const chapter = chapterSelect.value;
  if (!book || !chapter || !bibleData[book] || !bibleData[book][chapter]) {
    return "";
  }

  const verses = bibleData[book][chapter];
  // Join verses with small pauses (represented by dots/line breaks)
  const parts = [];
  for (const [vNum, text] of Object.entries(verses)) {
    parts.push(`${vNum}. ${text}`);
  }
  return parts.join(". ");
}

function startTTS() {
  if (!("speechSynthesis" in window)) {
    ttsStatus.textContent = "Text-to-speech is not supported in this browser.";
    return;
  }

  const text = getCurrentChapterText();
  if (!text) {
    ttsStatus.textContent = "Please select a book and chapter first.";
    return;
  }

  // Stop any existing speech
  window.speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(text);

  // Language selection based on currentTranslation
  if (currentTranslation === "en") {
    currentUtterance.lang = "en-IN"; // or "en-US" if better
  } else {
    currentUtterance.lang = "ta-IN"; // Tamil – depends on OS/browser
  }

  currentUtterance.rate = 0.95;  // a bit slower
  currentUtterance.pitch = 1.0;

  currentUtterance.onstart = () => {
    isSpeaking = true;
    ttsStatus.textContent = "Speaking current chapter...";
  };
  currentUtterance.onend = () => {
    isSpeaking = false;
    ttsStatus.textContent = "Finished.";
  };
  currentUtterance.onerror = (e) => {
    console.error("TTS error:", e);
    isSpeaking = false;
    ttsStatus.textContent = "Error while speaking.";
  };

  window.speechSynthesis.speak(currentUtterance);
}

function stopTTS() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  isSpeaking = false;
  ttsStatus.textContent = "Stopped.";
}

// (Event listeners are attached after DOMContentLoaded below)


// ---- Load Bible JSON ----
async function loadBible(translation) {
  currentTranslation = translation;
  bibleData = {};
  if (bookSelect) bookSelect.innerHTML = '<option value="">Book...</option>';
  if (chapterSelect) chapterSelect.innerHTML = '<option value="">Chapter...</option>';
  if (bibleTextDiv) bibleTextDiv.innerHTML = "";
  if (currentRefDiv) currentRefDiv.textContent = "Loading Bible…";

  try {
    const res = await fetch(translationFiles[translation]);
    const data = await res.json();

    // Normalizer: support multiple possible JSON shapes
    // Desired shape: bibleData[bookName][chapterNumber][verseNumber] = "text"
    function addBookObj(bookName, chapters) {
      bibleData[bookName] = bibleData[bookName] || {};
      if (Array.isArray(chapters)) {
        // chapters: [{chapter: "1", verses: [{verse:"1",text:"..."}, ...]}, ...]
        chapters.forEach(ch => {
          const chNum = ch.chapter || ch.chapter_number || String(ch.number || "");
          if (!chNum) return;
          bibleData[bookName][chNum] = bibleData[bookName][chNum] || {};
          if (Array.isArray(ch.verses)) {
            ch.verses.forEach(v => {
              if (v && v.verse != null && v.text != null) bibleData[bookName][chNum][String(v.verse)] = v.text;
            });
          } else if (typeof ch.verses === 'object') {
            Object.entries(ch.verses).forEach(([vnum, txt]) => bibleData[bookName][chNum][vnum] = txt);
          }
        });
      } else if (typeof chapters === 'object') {
        // chapters: { "1": { "1": "text", ... }, ... }
        Object.entries(chapters).forEach(([chNum, verses]) => {
          bibleData[bookName][chNum] = bibleData[bookName][chNum] || {};
          if (typeof verses === 'object' && !Array.isArray(verses)) {
            Object.entries(verses).forEach(([vnum, txt]) => bibleData[bookName][chNum][vnum] = txt);
          }
        });
      }
    }

    if (Array.isArray(data)) {
      // array of book objects or array of books mapped
      data.forEach(item => {
        if (item && item.book && item.chapters) addBookObj(item.book, item.chapters);
        else if (typeof item === 'object') {
          // fallback: try to interpret as { "Genesis": { ... } }
          Object.entries(item).forEach(([k, v]) => {
            if (k && v) addBookObj(k, v);
          });
        }
      });
    } else if (data && data.book && data.chapters) {
      // single-book file like 1John.json
      addBookObj(data.book, data.chapters);
    } else if (data && data.books && Array.isArray(data.books)) {
      data.books.forEach(b => { if (b.book && b.chapters) addBookObj(b.book, b.chapters); });
    } else {
      // assume already in expected shape: { "Genesis": { "1": { "1": "..." } } }
      bibleData = data;
    }

    populateBooks();
    if (currentRefDiv) currentRefDiv.textContent = "Select a book and chapter to start reading.";
  } catch (err) {
    console.error(err);
    if (currentRefDiv) currentRefDiv.textContent = "Unable to load Bible data. Check the JSON path.";
  }
}

function populateBooks() {
  const books = Object.keys(bibleData);
  books.forEach(book => {
    const opt = document.createElement("option");
    opt.value = book;
    opt.textContent = book;
    bookSelect.appendChild(opt);
  });
}

function populateChapters(book) {
  chapterSelect.innerHTML = '<option value="">Chapter...</option>';
  bibleTextDiv.innerHTML = "";

  if (!book || !bibleData[book]) return;

  const chapters = Object.keys(bibleData[book]);
  chapters.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch;
    opt.textContent = ch;
    chapterSelect.appendChild(opt);
  });
}

function renderChapter(book, chapter) {
  bibleTextDiv.innerHTML = "";
  if (!book || !chapter || !bibleData[book] || !bibleData[book][chapter]) {
    return;
  }

  const versesObj = bibleData[book][chapter];
  const versesNums = Object.keys(versesObj);

  versesNums.forEach(vNum => {
    const p = document.createElement("p");
    p.className = "verse";
    const numSpan = document.createElement("span");
    numSpan.className = "num";
    numSpan.textContent = vNum;
    p.appendChild(numSpan);
    p.appendChild(document.createTextNode(versesObj[vNum]));
    bibleTextDiv.appendChild(p);
  });

  currentRefDiv.textContent = `${book} ${chapter} (${currentTranslation === "en" ? "KJV" : "தமிழ் OV"})`;
}

// ---- Search ----
function searchBible() {
  const queryRaw = searchInput.value.trim();
  searchResultsDiv.innerHTML = "";

  if (!queryRaw) return;
  if (!Object.keys(bibleData).length) {
    searchResultsDiv.textContent = "Bible not loaded yet.";
    return;
  }

  let useRegex = queryRaw.includes("*");
  let regex = null;
  let query = queryRaw.toLowerCase();

  if (useRegex) {
    const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
    try {
      regex = new RegExp(pattern, "i");
    } catch (e) {
      searchResultsDiv.textContent = "Invalid pattern.";
      return;
    }
  }

  const results = [];
  for (const [book, chapters] of Object.entries(bibleData)) {
    for (const [ch, verses] of Object.entries(chapters)) {
      for (const [vNum, text] of Object.entries(verses)) {
        const lowerText = text.toLowerCase();
        let match = false;

        if (useRegex && regex) {
          match = regex.test(text);
        } else {
          match = lowerText.includes(query);
        }

        if (match) {
          results.push({
            book,
            chapter: ch,
            verse: vNum,
            text
          });
        }
      }
    }
  }

  if (!results.length) {
    searchResultsDiv.textContent = "No verses found.";
    return;
  }

  const header = document.createElement("h4");
  header.textContent = `Found ${results.length} verse(s):`;
  searchResultsDiv.appendChild(header);

  results.slice(0, 150).forEach(r => {
    const p = document.createElement("p");
    p.className = "verse";
    const ref = `${r.book} ${r.chapter}:${r.verse}`;
    const refSpan = document.createElement("span");
    refSpan.className = "num";
    refSpan.textContent = ref;
    p.appendChild(refSpan);
    p.appendChild(document.createTextNode(r.text));
    searchResultsDiv.appendChild(p);
  });

  if (results.length > 150) {
    const more = document.createElement("p");
    more.style.fontSize = "0.8rem";
    more.style.color = "#9ca3af";
    more.textContent = `Showing first 150 results. Please refine your search.`;
    searchResultsDiv.appendChild(more);
  }
}

// ---- Audio switching ----
// Put your real playlist IDs here
const audioPlaylists = {
  en: "YOUR_ENGLISH_PLAYLIST_ID",
  ta: "YOUR_TAMIL_PLAYLIST_ID"
};

function updateAudio() {
  if (!audioLangSelect || !audioFrame) return;
  const lang = audioLangSelect.value;
  const playlistId = audioPlaylists[lang];
  if (!playlistId) return;

  audioFrame.src = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
}

// (Event listeners are attached after DOMContentLoaded below)

// Attach listeners after DOM is ready and initialize
document.addEventListener("DOMContentLoaded", () => {
  // assign elements
  ttsPlayBtn = document.getElementById("ttsPlay");
  ttsStopBtn = document.getElementById("ttsStop");
  ttsStatus = document.getElementById("ttsStatus");

  translationSelect = document.getElementById("translationSelect");
  bookSelect = document.getElementById("bookSelect");
  chapterSelect = document.getElementById("chapterSelect");
  bibleTextDiv = document.getElementById("bibleText");
  currentRefDiv = document.getElementById("currentRef");

  searchInput = document.getElementById("searchInput");
  searchButton = document.getElementById("searchButton");
  searchResultsDiv = document.getElementById("searchResults");

  audioLangSelect = document.getElementById("audioLang");
  audioFrame = document.getElementById("audioFrame");

  // TTS buttons
  if (ttsPlayBtn) ttsPlayBtn.addEventListener("click", startTTS);
  if (ttsStopBtn) ttsStopBtn.addEventListener("click", stopTTS);

  // other listeners with guards
  if (translationSelect) translationSelect.addEventListener("change", (e) => loadBible(e.target.value));
  if (bookSelect) bookSelect.addEventListener("change", (e) => populateChapters(e.target.value));
  if (chapterSelect) chapterSelect.addEventListener("change", () => renderChapter(bookSelect.value, chapterSelect.value));

  if (searchButton) searchButton.addEventListener("click", searchBible);
  if (searchInput) searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchBible();
    }
  });

  if (audioLangSelect) audioLangSelect.addEventListener("change", updateAudio);

  // ---- Init ----
  loadBible(currentTranslation);
  updateAudio();
});
