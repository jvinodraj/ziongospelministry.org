/**
 * bible-portal.js — Self-contained controller for bible-reader.html
 *
 * Responsibilities:
 *  - Load all 66 books from assets/data/bible-books.json
 *  - Load chapter text from bible-data/{file} for KJV (full Bible)
 *  - Use SAMPLE_BIBLE_DATA for NKJV / NIV / ESV / Tamil PV
 *  - Drive every dropdown, view mode, and action button in bible-reader.html
 */

(function () {
  "use strict";

  /* ============================================================
   * Constants
   * ============================================================ */
  // Translations with full per-book JSON data available under bible-data/{value}/
  const EN_TRANSLATIONS = [
    { value: "kjv",  label: "KJV  — King James Version",           full: true  },
    { value: "nkjv", label: "NKJV — New King James Version",        full: false },
    { value: "niv",  label: "NIV  — New International Version",     full: false },
    { value: "esv",  label: "ESV  — English Standard Version",      full: false }
  ];

  const TA_TRANSLATIONS = [
    { value: "pv", label: "PV — பரிசுத்த வேதாகமம் (Tamil OV)" }
  ];

  const ALL_TRANSLATIONS = EN_TRANSLATIONS.concat(TA_TRANSLATIONS);

  // Translations whose per-book files are currently just placeholder stubs
  const STUB_TRANSLATIONS = new Set(["nkjv", "niv", "esv"]);

  /* ============================================================
   * App State
   * ============================================================ */
  const state = {
    books: [],                // full 66-book list
    booksMap: {},             // name → {name, slug, file, testament, chapters}
    chapterCache: {},         // "BookName|chapter|translation" → {v1:..., v2:...}
    currentBook: null,
    currentChapter: null,
    currentVerse: null,
    primaryTranslation: "kjv",
    taTranslation: "pv",
    showTamil: false,
    showVerseNumbers: true,
    readerMode: false,
    viewMode: "chapter",
    sermons: [],
    verses: [],
    backgroundMusicEnabled: true,
    backgroundMusicVolume: 0.15
  };

  /* ============================================================
   * Helper: HTML escape
   * ============================================================ */
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ============================================================
   * Helper: get element by ID
   * ============================================================ */
  function q(id) { return document.getElementById(id); }

  /* ============================================================
   * Web Audio API - Soaking Worship Ambient Generator
   * ============================================================ */
  let audioContext = null;
  let backgroundAudioNodes = {};
  let chordTimer = null;

  function initAudioContext() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Generate a reverb impulse response buffer for spacious, cathedral-like sound
  function createReverbBuffer(ctx, durationSec, decay) {
    var rate   = ctx.sampleRate;
    var length = Math.floor(rate * durationSec);
    var buffer = ctx.createBuffer(2, length, rate);
    for (var c = 0; c < 2; c++) {
      var data = buffer.getChannelData(c);
      for (var i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  // Play one soft piano-like note with attack, sustain, and release
  function playWorshipNote(ctx, freq, startTime, duration, destination) {
    var osc      = ctx.createOscillator();
    var osc2     = ctx.createOscillator();
    var gain     = ctx.createGain();

    // Triangle wave is softer and more like a muted piano
    osc.type  = 'triangle';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq,       startTime);
    osc2.frequency.setValueAtTime(freq * 2,  startTime);  // Octave above for shimmer

    var osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.25, startTime);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);
    osc.connect(gain);

    // Soft ADSR: slow attack, gentle decay, long release
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.5);   // Attack
    gain.gain.linearRampToValueAtTime(0.10, startTime + 2.5);   // Decay to sustain
    gain.gain.setValueAtTime(0.10, startTime + duration - 2.0); // Hold sustain
    gain.gain.linearRampToValueAtTime(0, startTime + duration); // Release

    gain.connect(destination);
    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + duration + 0.1);
    osc2.stop(startTime + duration + 0.1);
  }

  function startChordProgression() {
    if (!audioContext) return;

    var ctx = audioContext;

    // Build reverb (large, warm cathedral reverb)
    var reverb = ctx.createConvolver();
    reverb.buffer = createReverbBuffer(ctx, 5, 2.5);

    var masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(state.backgroundMusicVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Wet (reverb) path
    var wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.65, ctx.currentTime);
    reverb.connect(wetGain);
    wetGain.connect(masterGain);

    // Dry path
    var dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.35, ctx.currentTime);
    dryGain.connect(masterGain);

    backgroundAudioNodes = {
      masterGain: masterGain,
      reverb: reverb,
      wetGain: wetGain,
      dryGain: dryGain,
      oscillators: [{}]  // Mark as active
    };

    // G major soaking worship chord progression (G - D - Em - C)
    // All frequencies in Hz, 2 octaves for depth
    var chords = [
      // G major  – G2, B2, D3, G3, B3
      [98.00, 123.47, 146.83, 196.00, 246.94, 392.00],
      // D major  – D2, F#2, A2, D3, F#3
      [73.42, 92.50,  110.00, 146.83, 185.00, 293.66],
      // E minor  – E2, G2, B2, E3, G3
      [82.41, 98.00,  123.47, 164.81, 196.00, 329.63],
      // C major  – C2, E2, G2, C3, E3
      [65.41, 82.41,  98.00,  130.81, 164.81, 261.63]
    ];

    var chordIdx  = 0;
    var noteDur   = 12;  // seconds each chord sustains
    var arpDelay  = 0.55; // seconds between each arpeggio note

    function playNextChord() {
      if (!backgroundAudioNodes.oscillators) return; // Stopped

      var chord     = chords[chordIdx % chords.length];
      var startTime = ctx.currentTime + 0.05;

      chord.forEach(function (freq, i) {
        playWorshipNote(ctx, freq, startTime + i * arpDelay, noteDur, dryGain);
        playWorshipNote(ctx, freq, startTime + i * arpDelay, noteDur, reverb);
      });

      chordIdx++;
      chordTimer = setTimeout(playNextChord, noteDur * 1000 * 0.75); // Overlap slightly
    }

    playNextChord();
  }

  function createAmbientSound() {
    if (!audioContext) initAudioContext();
    if (backgroundAudioNodes.oscillators) return; // Already playing
    startChordProgression();
  }

  function stopAmbientSound() {
    if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
    if (backgroundAudioNodes.masterGain && audioContext) {
      backgroundAudioNodes.masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.5);
    }
    backgroundAudioNodes = {};
  }

  /* ============================================================
   * Helper: Toast notifications
   * ============================================================ */
  function toast(msg, color) {
    var existing = document.getElementById("_zgm-toast");
    if (existing) existing.remove();
    var t = document.createElement("div");
    t.id = "_zgm-toast";
    t.textContent = msg;
    t.style.cssText = [
      "position:fixed", "bottom:1.5rem", "right:1.5rem", "z-index:9999",
      "background:" + (color || "#2e7d32"), "color:#fff",
      "padding:0.7rem 1.2rem", "border-radius:8px",
      "font-size:0.9rem", "box-shadow:0 4px 14px rgba(0,0,0,0.25)",
      "opacity:0", "transition:opacity 0.2s"
    ].join(";");
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = "1"; });
    setTimeout(function () {
      t.style.opacity = "0";
      setTimeout(function () { t.remove(); }, 200);
    }, 2800);
  }

  async function tryFetchJson(paths) {
    for (var i = 0; i < paths.length; i++) {
      try {
        var res = await fetch(paths[i]);
        if (!res.ok) continue;
        var data = await res.json();
        return data;
      } catch (_) {
        // Continue trying remaining paths.
      }
    }
    return null;
  }

  function bookNameToFile(bookName) {
    return String(bookName || "").replace(/\s+/g, "") + ".json";
  }

  function setBooks(list) {
    state.books = Array.isArray(list) ? list : [];
    state.booksMap = {};
    state.books.forEach(function (book) {
      if (book && book.name) state.booksMap[book.name] = book;
    });
  }

  async function buildBooksFromNames(bookNames) {
    var out = [];
    for (var i = 0; i < bookNames.length; i++) {
      var name = String(bookNames[i] || "").trim();
      if (!name) continue;

      var file = bookNameToFile(name);
      var chapterCount = 1;
      var raw = await tryFetchJson([
        "bible-data/kjv/" + file,
        "./bible-data/kjv/" + file,
        "/bible-data/kjv/" + file
      ]);

      if (raw && Array.isArray(raw.chapters) && raw.chapters.length) {
        chapterCount = raw.chapters.length;
      }

      out.push({
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        file: file,
        testament: i < 39 ? "ot" : "nt",
        chapters: chapterCount
      });
    }
    return out;
  }

  async function loadBooks() {
    var list = await tryFetchJson([
      "assets/data/bible-books.json",
      "./assets/data/bible-books.json",
      "/assets/data/bible-books.json"
    ]);

    if (Array.isArray(list) && list.length && list[0] && list[0].name) {
      setBooks(list);
      return;
    }

    var names = await tryFetchJson([
      "bible-data/Books.json",
      "./bible-data/Books.json",
      "/bible-data/Books.json"
    ]);

    if (Array.isArray(names) && names.length) {
      var rebuilt = await buildBooksFromNames(names);
      setBooks(rebuilt);
      return;
    }

    var sample = (window.SAMPLE_BIBLE_DATA || {}).books || [];
    if (Array.isArray(sample) && sample.length) {
      setBooks(sample);
      return;
    }

    setBooks([]);
    toast("Unable to load Bible books. Please refresh.", "#e53935");
  }

  function syncTileActive(gridId, value) {
    const grid = q(gridId);
    if (!grid) return;
    grid.querySelectorAll(".tile-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.value === String(value));
    });
  }

  function isTamilTranslation(value) {
    return TA_TRANSLATIONS.some(t => t.value === value);
  }

  function translationLabel(value) {
    var match = null;
    for (var i = 0; i < ALL_TRANSLATIONS.length; i++) {
      if (ALL_TRANSLATIONS[i].value === value) {
        match = ALL_TRANSLATIONS[i];
        break;
      }
    }
    return ((match && match.label) || value || "").trim();
  }

  /* ============================================================
   * Build combined book/chapter <select>
   * ============================================================ */
  function populateBookSelect() {
    const sel = q("book-select");
    if (!sel) return;

    sel.innerHTML = '<option value="">Select a book…</option>';

    state.books.forEach(function (book) {
      const opt = document.createElement("option");
      opt.value = book.name;
      opt.textContent = book.name;
      sel.appendChild(opt);
    });
  }

  function populateChapterSelect(bookName) {
    const sel = q("chapter-select");
    if (!sel) return;
    sel.innerHTML = '<option value="">Select a chapter…</option>';
    sel.disabled = !bookName;

    if (!bookName) return;

    const book = state.booksMap[bookName];
    if (!book) return;

    for (let i = 1; i <= book.chapters; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = "Chapter " + i;
      sel.appendChild(opt);
    }
  }

  function setCombinedSelection(bookName, chapter) {
    const bookSel = q("book-select");
    const chapterSel = q("chapter-select");
    if (bookSel) bookSel.value = bookName || "";
    if (chapterSel) chapterSel.value = chapter || "";
  }

  function extractChapter(raw, bookName, chapter) {
    if (!raw) return null;

    if (raw.chapters && Array.isArray(raw.chapters)) {
      for (var i = 0; i < raw.chapters.length; i++) {
        if (String(raw.chapters[i].chapter) === String(chapter)) {
          var verses = raw.chapters[i].verses || [];
          var out = {};
          for (var j = 0; j < verses.length; j++) {
            out[String(verses[j].verse)] = verses[j].text;
          }
          return out;
        }
      }
      return null;
    }

    if (raw[bookName] && raw[bookName][String(chapter)]) {
      return raw[bookName][String(chapter)];
    }

    if (raw[String(chapter)]) {
      return raw[String(chapter)];
    }

    return null;
  }

  async function getChapterData(bookName, chapter, translationKey) {
    var cacheKey = bookName + "|" + chapter + "|" + translationKey;
    if (state.chapterCache[cacheKey]) return state.chapterCache[cacheKey];

    var bookMeta = state.booksMap[bookName];
    if (!bookMeta) return null;

    // All translations now live at bible-data/{translationKey}/{Book}.json
    // NKJV / NIV / ESV files are stubs (chapters:[]) until full data is added
    if (STUB_TRANSLATIONS.has(translationKey)) {
      return null; // stubs have no verse content yet
    }

    var filePath = "bible-data/" + translationKey + "/" + bookMeta.file;
    try {
      var res = await fetch(filePath);
      if (!res.ok) return null;
      var raw = await res.json();

      // Stub check: placeholder files have no chapters
      if (raw && raw.status === "placeholder") return null;

      var data = extractChapter(raw, bookName, chapter);
      if (data && Object.keys(data).length) {
        state.chapterCache[cacheKey] = data;
        return data;
      }
    } catch (_) {}

    return null;
  }

  /* ============================================================
   * RENDER: dispatch to active view mode
   * ============================================================ */
  async function renderVerseArea() {
    if (!state.currentBook || !state.currentChapter) {
      q("verse-content").innerHTML =
        '<div class="placeholder"><p>Select a book and chapter to begin reading.</p></div>';
      q("current-ref").textContent = "Select a chapter";
      return;
    }

    const primaryData = await getChapterData(state.currentBook, state.currentChapter, state.primaryTranslation);
    const companionKey = isTamilTranslation(state.primaryTranslation) ? "kjv" : state.taTranslation;
    const companionData = state.showTamil
      ? await getChapterData(state.currentBook, state.currentChapter, companionKey)
      : null;

    // If no verse selected and NOT in audio/meditation mode, default to chapter view.
    // Audio and meditation modes work with or without a specific verse.
    const effectiveViewMode = (state.currentVerse || state.viewMode === "audio" || state.viewMode === "meditation") 
      ? state.viewMode 
      : "chapter";

    switch (effectiveViewMode) {
      case "chapter":     renderChapterView(primaryData, companionData);  break;
      case "parallel":    renderParallelView(primaryData, companionData); break;
      case "meditation":  renderMeditationView(primaryData);              break;
      case "audio":       renderAudioView(primaryData);                   break;
      default:             renderSingleVerseView(primaryData, companionData);
    }

    updateCurrentRef();
  }

  /* ============================================================
   * RENDER: Single Verse
   * ============================================================ */
  function renderSingleVerseView(primaryData, companionData) {
    if (!primaryData) {
      q("verse-content").innerHTML =
        '<div class="placeholder"><p>No data available for this passage yet. Full data coming soon.</p></div>';
      return;
    }

    if (!state.currentVerse || !primaryData[state.currentVerse]) {
      q("verse-content").innerHTML =
        '<div class="placeholder"><p>Select a chapter from the dropdown.</p></div>';
      return;
    }

    const vNum   = state.currentVerse;
    const primaryText = primaryData[vNum] || "";
    const companionText = companionData ? (companionData[vNum] || "") : "";
    const primaryLabel = translationLabel(state.primaryTranslation);
    const companionLabel = isTamilTranslation(state.primaryTranslation)
      ? translationLabel("kjv")
      : translationLabel(state.taTranslation);

    let html = '<div class="verse-content-english">';
    html += `<span class="verse-language-label">${esc(primaryLabel)}</span>`;
    html += `<p class="verse-text">`;
    if (state.showVerseNumbers) html += `<span class="verse-number">${esc(vNum)}</span>`;
    html += `${esc(primaryText)}</p></div>`;

    if (state.showTamil && companionText) {
      html += '<div class="verse-content-tamil">';
      html += `<span class="verse-language-label">${esc(companionLabel)}</span>`;
      html += `<p class="verse-text">`;
      if (state.showVerseNumbers) html += `<span class="verse-number">${esc(vNum)}</span>`;
      html += `${esc(companionText)}</p></div>`;
    }

    q("verse-content").innerHTML = html;
  }

  /* ============================================================
   * RENDER: Full Chapter
   * ============================================================ */
  function renderChapterView(primaryData, companionData) {
    if (!primaryData) {
      q("verse-content").innerHTML =
        '<div class="placeholder"><p>No data available for this chapter yet.</p></div>';
      return;
    }

    let html = `<h2>${esc(state.currentBook)} ${esc(state.currentChapter)}</h2>`;

    Object.keys(primaryData)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(v => {
        html += `<div class="verse-text">`;
        if (state.showVerseNumbers) html += `<span class="verse-number">${v}</span>`;
        html += `${esc(primaryData[String(v)])}</div>`;

        if (state.showTamil && companionData && companionData[String(v)]) {
          html += `<div class="verse-text verse-text-ta">`;
          if (state.showVerseNumbers) html += `<span class="verse-number verse-number-ta">${v}</span>`;
          html += `${esc(companionData[String(v)])}</div>`;
        }
      });

    q("verse-content").innerHTML = html;
  }

  /* ============================================================
   * RENDER: Parallel View
   * ============================================================ */
  function renderParallelView(primaryData, companionData) {
    if (!primaryData) {
      q("verse-content").innerHTML =
        '<div class="placeholder"><p>No data available for this passage yet.</p></div>';
      return;
    }

    const primaryLabel = translationLabel(state.primaryTranslation);
    const companionLabel = isTamilTranslation(state.primaryTranslation)
      ? translationLabel("kjv")
      : translationLabel(state.taTranslation);

    let enCol = `<div class="parallel-column"><span class="verse-language-label">${esc(primaryLabel)}</span>`;
    let taCol = `<div class="parallel-column"><span class="verse-language-label">${esc(companionLabel)}</span>`;

    Object.keys(primaryData)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(v => {
        enCol += `<div class="verse-text">`;
        if (state.showVerseNumbers) enCol += `<span class="verse-number">${v}</span>`;
        enCol += `${esc(primaryData[String(v)])}</div>`;

        taCol += `<div class="verse-text">`;
        if (state.showVerseNumbers) taCol += `<span class="verse-number">${v}</span>`;
        taCol += companionData && companionData[String(v)]
          ? esc(companionData[String(v)])
          : `<span class="muted" style="font-size:.85rem;font-style:italic">Companion text coming soon</span>`;
        taCol += `</div>`;
      });

    enCol += "</div>";
    taCol += "</div>";

    q("verse-content").innerHTML = `<div class="parallel-view">${enCol}${taCol}</div>`;
  }

  /* ============================================================
   * RENDER: Meditation Mode
   * ============================================================ */
  function renderMeditationView(enData) {
    if (!enData || !state.currentVerse || !enData[state.currentVerse]) {
      q("verse-content").innerHTML =
        '<div class="placeholder"><p>Select a verse for meditation.</p></div>';
      return;
    }

    const ref  = `${state.currentBook} ${state.currentChapter}:${state.currentVerse}`;
    const text = enData[state.currentVerse] || "";

    q("verse-content").innerHTML = `
      <div class="meditation-view">
        <span class="verse-reference">${esc(ref)}</span>
        <p class="verse-text">${esc(text)}</p>
      </div>`;
  }

  /* ============================================================
   * RENDER: Audio View
   * ============================================================ */
  function renderAudioView(primaryData) {
    const ref = state.currentVerse
      ? `${state.currentBook} ${state.currentChapter}:${state.currentVerse}`
      : `${state.currentBook} ${state.currentChapter}`;

    q("verse-content").innerHTML = `
      <div class="audio-view">
        <h3>🎧 Audio Bible</h3>
        <p><strong>${esc(ref)}</strong></p>
        <div class="audio-controls">
          <button class="btn-play" id="audio-play-btn">▶ Play</button>
          <button class="btn-pause" id="audio-pause-btn">⏸ Pause</button>
          <button class="btn-stop" id="audio-stop-btn">⏹ Stop</button>
        </div>
        <div class="audio-progress">
          <div class="progress-bar-audio"><div class="progress-fill-audio" id="audio-bar" style="width:0%"></div></div>
          <div class="audio-time" id="audio-time-label">Ready to play</div>
        </div>
        <div class="background-music-section">
          <div class="music-toggle">
            <label>
              <input type="checkbox" id="bg-music-toggle" ${state.backgroundMusicEnabled ? 'checked' : ''}>
              <span>🎵 Background Music</span>
            </label>
          </div>
          <div class="music-volume-control" ${state.backgroundMusicEnabled ? '' : 'style="display:none"'}>
            <label for="bg-music-volume">Volume:</label>
            <input type="range" id="bg-music-volume" min="0" max="100" value="${Math.round(state.backgroundMusicVolume * 100)}" class="volume-slider">
          </div>
        </div>
      </div>`;

    q("audio-play-btn").addEventListener("click", () => speakVerse(primaryData));
    q("audio-pause-btn").addEventListener("click", () => { 
      window.speechSynthesis.pause();
      pauseBackgroundMusic();
    });
    q("audio-stop-btn").addEventListener("click", () => { 
      window.speechSynthesis.cancel();
      stopBackgroundMusic();
    });

    // Background music toggle
    const bgToggle = q("bg-music-toggle");
    const volumeControl = q("bg-music-volume").parentElement;
    if (bgToggle) {
      bgToggle.addEventListener("change", function (e) {
        state.backgroundMusicEnabled = e.target.checked;
        volumeControl.style.display = e.target.checked ? "block" : "none";
        if (!e.target.checked) stopBackgroundMusic();
      });
    }

    // Background music volume control
    const volSlider = q("bg-music-volume");
    if (volSlider) {
      volSlider.addEventListener("input", function (e) {
        state.backgroundMusicVolume = e.target.value / 100;
        if (backgroundAudioNodes.masterGain && audioContext) {
          backgroundAudioNodes.masterGain.gain.setTargetAtTime(
            state.backgroundMusicVolume,
            audioContext.currentTime,
            0.1
          );
        }
      });
    }
  }

  /* ============================================================
   * Text-to-Speech
   * ============================================================ */
  function playBackgroundMusic() {
    if (!state.backgroundMusicEnabled) return;
    try {
      initAudioContext();
      
      // Resume audio context if it's suspended (browser security)
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      createAmbientSound();
      
      // Update volume
      if (backgroundAudioNodes.masterGain && audioContext) {
        backgroundAudioNodes.masterGain.gain.setTargetAtTime(
          state.backgroundMusicVolume,
          audioContext.currentTime,
          0.1
        );
      }
      console.log("Background music started");
    } catch (e) {
      console.log("Background music error:", e.message);
    }
  }

  function pauseBackgroundMusic() {
    // Note: Web Audio oscillators can't truly pause, so we'll mute instead
    if (backgroundAudioNodes.masterGain && audioContext) {
      backgroundAudioNodes.masterGain.gain.setTargetAtTime(
        0,
        audioContext.currentTime,
        0.1
      );
    }
  }

  function stopBackgroundMusic() {
    stopAmbientSound();
  }

  async function speakVerse(providedData) {
    if (!window.speechSynthesis) { toast("Text-to-speech not supported.", "#e53935"); return; }
    window.speechSynthesis.cancel();
    playBackgroundMusic();

    const primaryData = providedData || await getChapterData(state.currentBook, state.currentChapter, state.primaryTranslation);
    if (!primaryData) { toast("No text to read.", "#e53935"); return; }

    let text = "";
    if (state.currentVerse && primaryData[state.currentVerse]) {
      text = primaryData[state.currentVerse];
    } else {
      // Read whole chapter
      text = Object.keys(primaryData).map(Number).sort((a,b)=>a-b)
        .map(v => `${v}. ${primaryData[String(v)]}`).join(" ");
    }

    const utt = new SpeechSynthesisUtterance(text);
    
    // Set language-specific parameters for more natural sound
    if (isTamilTranslation(state.primaryTranslation)) {
      utt.lang = "ta-IN";  // Tamil (India)
      utt.rate = 0.8;      // Slightly slower for better clarity
      utt.pitch = 1.0;     // Natural pitch
      utt.volume = 1.0;    // Full volume
    } else {
      utt.lang = "en-US";  // English (US)
      utt.rate = 0.85;     // Natural reading pace
      utt.pitch = 1.0;
      utt.volume = 1.0;
    }
    
    // Prefer female voices for more natural, warm sound
    // Also prioritize neural voices (usually have "neural" in name or better quality)
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const targetLang = isTamilTranslation(state.primaryTranslation) ? "ta" : "en";
      
      // First try to find a neural/premium female voice
      let selectedVoice = voices.find(v => 
        v.lang.startsWith(targetLang) && 
        v.name.toLowerCase().includes("female")
      );
      
      // If no female voice found, try any voice for the language
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith(targetLang));
      }
      
      if (selectedVoice) {
        utt.voice = selectedVoice;
      }
    }
    
    window.speechSynthesis.speak(utt);
    toast("Playing audio with background music...", "#2196F3");
  }

  /* ============================================================
   * Update reference label
   * ============================================================ */
  function updateCurrentRef() {
    const el = q("current-ref");
    if (!el) return;
    if (state.currentBook && state.currentChapter) {
      el.textContent = state.currentVerse
        ? `${state.currentBook} ${state.currentChapter}:${state.currentVerse}`
        : `${state.currentBook} ${state.currentChapter}`;
    } else {
      el.textContent = "Select a verse";
    }
  }

  /* ============================================================
   * Update chapter info sidebar
   * ============================================================ */
  function updateChapterInfo() {
    const el = q("chapter-info");
    if (!el || !state.currentBook) return;

    const book = state.booksMap[state.currentBook] || {};
    const primaryLabel = translationLabel(state.primaryTranslation);
    const companionLabel = isTamilTranslation(state.primaryTranslation)
      ? translationLabel("kjv")
      : translationLabel(state.taTranslation);

    el.innerHTML = `
      <dl>
        <dt>Book</dt><dd>${esc(state.currentBook)}</dd>
        <dt>Testament</dt><dd>${esc(book.testament === "ot" ? "Old Testament" : "New Testament")}</dd>
        <dt>Chapter</dt><dd>${esc(state.currentChapter || "—")}</dd>
        <dt>Primary</dt><dd>${esc(primaryLabel)}</dd>
        <dt>Companion</dt><dd>${state.showTamil ? esc(companionLabel) : "Hidden"}</dd>
      </dl>`;
  }

  /* ============================================================
   * Related Sermons
   * ============================================================ */
  function updateRelatedSermons() {
    const el = q("related-sermons");
    if (!el) return;

    if (!state.currentBook) {
      el.innerHTML = '<p class="muted">Select a passage to see related sermons.</p>';
      return;
    }

    const related = state.sermons.filter(s => s.passage && s.passage.includes(state.currentBook)).slice(0, 3);

    if (!related.length) {
      el.innerHTML = '<p class="muted">No sermons found for this book.</p>';
      return;
    }

    el.innerHTML = related.map(s => `
      <a class="related-item" href="${esc(s.media)}" target="_blank" rel="noopener noreferrer">
        <span class="related-item-title">${esc(s.title)}</span>
        <span class="related-item-meta">${esc(s.speaker)} · ${esc(s.passage)}</span>
      </a>`).join("");
  }

  /* ============================================================
   * Related Verses
   * ============================================================ */
  function updateRelatedVerses() {
    const el = q("related-verses-list");
    if (!el) return;

    const primaryData = state.chapterCache[`${state.currentBook}|${state.currentChapter}|${state.primaryTranslation}`];
    if (!primaryData || !state.currentVerse) {
      el.innerHTML = '<p class="muted">Related verses will appear here.</p>';
      return;
    }

    const curText = (primaryData[state.currentVerse] || "").toLowerCase();
    const words   = curText.match(/\b\w{5,}\b/g) || [];
    const keywords = Array.from(new Set(words)).slice(0, 6);

    const related = state.verses.filter(v => {
      if (v.reference === `${state.currentBook} ${state.currentChapter}:${state.currentVerse}`) return false;
      return keywords.some(k => v.text.toLowerCase().includes(k));
    }).slice(0, 5);

    if (!related.length) {
      el.innerHTML = '<p class="muted">No related verses found.</p>';
      return;
    }

    el.innerHTML = related.map(v => `
      <div class="related-item">
        <span class="related-item-title">${esc(v.reference)}</span>
        <span class="related-item-meta">${esc(v.text.slice(0, 80))}…</span>
      </div>`).join("");
  }

  /* ============================================================
   * Daily Verse
   * ============================================================ */
  function renderDailyVerse() {
    const el = q("daily-verse-card");
    if (!el || !state.verses.length) return;

    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const v = state.verses[dayOfYear % state.verses.length];

    el.innerHTML = `
      <span class="verse-card-reference">${esc(v.reference)}</span>
      <p class="verse-card-text">"${esc(v.text)}"</p>`;
  }

  /* ============================================================
   * Search
   * ============================================================ */
  function runSearch() {
    const rawQuery = (q("verse-search").value || "").trim().toLowerCase();
    const resultsEl = q("search-results");
    if (!rawQuery) { resultsEl.classList.add("hidden"); return; }

    // Direct reference e.g. "John 3:16"
    const refMatch = rawQuery.match(/^([1-3]?\s*[a-z\s]+?)\s+(\d+)(?::(\d+))?$/i);
    if (refMatch) {
      const bookQuery = refMatch[1].trim();
      const chapter   = refMatch[2];
      const verse     = refMatch[3] || null;
      const found = state.books.find(b => b.name.toLowerCase().includes(bookQuery));
      if (found) {
        navigateTo(found.name, chapter, verse);
        resultsEl.classList.add("hidden");
        return;
      }
    }

    const hits = state.verses
      .filter(v => v.text.toLowerCase().includes(rawQuery) || v.reference.toLowerCase().includes(rawQuery))
      .slice(0, 20);

    if (!hits.length) {
      resultsEl.innerHTML = '<p class="muted" style="padding:1rem">No results found.</p>';
    } else {
      resultsEl.innerHTML = hits.map(v => `
        <div class="search-result-item" data-ref="${esc(v.reference)}" tabindex="0" role="button">
          <div class="search-result-ref">${esc(v.reference)}</div>
          <div class="search-result-text">${esc(v.text)}</div>
        </div>`).join("");

      resultsEl.querySelectorAll(".search-result-item").forEach(item => {
        item.addEventListener("click", () => {
          const ref = item.dataset.ref || "";
          const m = ref.match(/^(.*?)\s+(\d+):(\d+)$/);
          if (m) navigateTo(m[1], m[2], m[3]);
          resultsEl.classList.add("hidden");
          q("verse-search").value = "";
        });
      });
    }

    resultsEl.classList.remove("hidden");
  }

  /* ============================================================
   * Navigate programmatically to book/chapter/verse
   * ============================================================ */
  async function navigateTo(bookName, chapter, verse) {
    state.currentBook    = bookName;
    state.currentChapter = chapter;
    state.currentVerse   = null;

    setCombinedSelection(bookName, chapter);
    populateChapterSelect(bookName);

    await renderVerseArea();
    updateChapterInfo();
    updateRelatedSermons();
    updateRelatedVerses();
    q("verse-display").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ============================================================
   * Wire all event listeners
   * ============================================================ */
  function bindEvents() {
    /* ---- Book selector ---- */
    q("book-select").addEventListener("change", async e => {
      const bookName = e.target.value;
      state.currentBook    = bookName || null;
      state.currentChapter = null;
      state.currentVerse   = null;

      populateChapterSelect(bookName);
      q("chapter-select").value = "";

      if (bookName) updateRelatedSermons();
    });

    /* ---- Chapter selector ---- */
    q("chapter-select").addEventListener("change", async e => {
      const chapter = e.target.value;
      state.currentChapter = chapter || null;
      state.currentVerse   = null;

      if (!chapter) return;

      await renderVerseArea();
      updateChapterInfo();
      updateRelatedSermons();
      updateRelatedVerses();
    });

    /* ---- View mode radios ---- */
    document.querySelectorAll("input[name='view-mode']").forEach(radio => {
      radio.addEventListener("change", async e => {
        state.viewMode = e.target.value;
        await renderVerseArea();
      });
    });

    /* ---- Display options ---- */
    q("show-verse-numbers").addEventListener("change", e => {
      state.showVerseNumbers = e.target.checked;
      renderVerseArea();
    });
    q("dark-reader-mode").addEventListener("change", e => {
      state.readerMode = e.target.checked;
      q("verse-display").classList.toggle("reader-mode", e.target.checked);
    });
    q("show-translations").addEventListener("change", e => {
      state.showTamil = e.target.checked;
      renderVerseArea();
      updateChapterInfo();
    });

    /* ---- Unified translation selector (English + Tamil) ---- */
    const translationSel = q("translation-select");
    if (translationSel) {
      translationSel.addEventListener("change", async e => {
        state.primaryTranslation = e.target.value;
        updateChapterInfo();
        if (state.currentBook && state.currentChapter) {
          await renderVerseArea();
          updateRelatedVerses();
        }
      });
    }

    /* ---- Verse action buttons ---- */
    q("listen-btn").addEventListener("click", () => speakVerse(null));
    q("copy-btn").addEventListener("click", copyVerse);
    q("share-btn").addEventListener("click", shareVerse);
    q("bookmark-btn").addEventListener("click", bookmarkVerse);
    q("favorite-btn").addEventListener("click", favoriteVerse);

    /* ---- Navigation ---- */
    q("prev-btn").addEventListener("click", () => stepChapter(-1));
    q("next-btn").addEventListener("click", () => stepChapter(1));

    /* ---- Search ---- */
    q("search-btn").addEventListener("click", runSearch);
    q("verse-search").addEventListener("keyup", e => { if (e.key === "Enter") runSearch(); });

    /* ---- Close search on Escape ---- */
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") q("search-results").classList.add("hidden");
    });
  }

  /* ============================================================
   * Step verse prev / next
   * ============================================================ */
  async function stepVerse(dir) {
    return;
  }

  async function stepChapter(dir) {
    if (!state.currentBook || !state.currentChapter) return;
    const book = state.booksMap[state.currentBook];
    if (!book) return;

    const nextChapter = Number(state.currentChapter) + dir;
    if (nextChapter < 1 || nextChapter > book.chapters) {
      toast(dir === -1 ? "Already at first chapter." : "Already at last chapter.", "#3f6f98");
      return;
    }

    state.currentChapter = String(nextChapter);
    state.currentVerse = null;
    setCombinedSelection(state.currentBook, state.currentChapter);
    await renderVerseArea();
    updateChapterInfo();
    updateRelatedSermons();
    updateRelatedVerses();
  }

  /* ============================================================
   * Copy verse
   * ============================================================ */
  async function copyVerse() {
    const primaryData = await getChapterData(state.currentBook, state.currentChapter, state.primaryTranslation);
    if (!primaryData || !state.currentBook || !state.currentChapter) { toast("Select a chapter first.", "#e53935"); return; }

    const primaryLabel = translationLabel(state.primaryTranslation);
    const ref  = `${state.currentBook} ${state.currentChapter}`;
    const text = `${ref} (${primaryLabel})\n\n${Object.keys(primaryData).map(Number).sort((a,b)=>a-b).map(v => `${v}. ${primaryData[String(v)]}`).join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      toast("Verse copied to clipboard!");
    } catch (_) {
      toast("Could not copy. Please copy manually.", "#e53935");
    }
  }

  /* ============================================================
   * Share verse
   * ============================================================ */
  async function shareVerse() {
    const primaryData = await getChapterData(state.currentBook, state.currentChapter, state.primaryTranslation);
    if (!primaryData || !state.currentBook || !state.currentChapter) { toast("Select a chapter first.", "#e53935"); return; }

    const ref  = `${state.currentBook} ${state.currentChapter}`;
    const text = `${ref} — ${Object.keys(primaryData).map(Number).sort((a,b)=>a-b).slice(0, 3).map(v => primaryData[String(v)]).join(" ")}`;

    if (navigator.share) {
      try { await navigator.share({ title: "Holy Bible", text, url: window.location.href }); return; }
      catch (_) { /* fall through */ }
    }
    await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
    toast("Verse link copied for sharing!");
  }

  /* ============================================================
   * Bookmark / Favourite (localStorage)
   * ============================================================ */
  function bookmarkVerse() {
    const ref = `${state.currentBook} ${state.currentChapter}`;
    if (!state.currentBook || !state.currentChapter) { toast("Select a chapter first.", "#e53935"); return; }
    const key = "bgm-bookmarks";
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = saved.indexOf(ref);
    if (idx >= 0) { saved.splice(idx, 1); toast("Bookmark removed."); }
    else           { saved.push(ref);      toast("Verse bookmarked! 🔖"); }
    localStorage.setItem(key, JSON.stringify(saved));
  }

  function favoriteVerse() {
    const ref = `${state.currentBook} ${state.currentChapter}`;
    if (!state.currentBook || !state.currentChapter) { toast("Select a chapter first.", "#e53935"); return; }
    const key = "bgm-favorites";
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = saved.indexOf(ref);
    if (idx >= 0) { saved.splice(idx, 1); toast("Removed from favorites."); }
    else           { saved.push(ref);      toast("Added to favorites! ❤️"); }
    localStorage.setItem(key, JSON.stringify(saved));
  }

  /* ============================================================
   * Bootstrap
   * ============================================================ */
  async function init() {
    await loadBooks();

    // Load sermons for the related-content panel
    try {
      var sermonsRes = await fetch("assets/data/sermons.json");
      if (sermonsRes.ok) state.sermons = await sermonsRes.json();
    } catch (_) {}

    // Build daily-verse pool from devotions
    try {
      var devRes = await fetch("assets/data/devotions.json");
      if (devRes.ok) {
        var devotions = await devRes.json();
        state.verses = Array.isArray(devotions)
          ? devotions.map(function (d) {
              return { reference: d.scripture || d.reference || "", text: d.reflection || d.text || "" };
            })
          : [];
      }
    } catch (_) {}

    state.tamilData = null; // Loaded lazily on first Tamil PV request

    var translationSel = q("translation-select");
    if (translationSel) translationSel.value = state.primaryTranslation;

    populateBookSelect();
    bindEvents();
    renderDailyVerse();
    updateRelatedSermons();

    var rSermons = q("related-sermons");
    if (rSermons) rSermons.innerHTML = '<p class="muted">Select a passage to see related sermons.</p>';
  }

  /* Run after DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
