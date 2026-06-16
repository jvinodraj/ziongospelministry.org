(function () {
  "use strict";

  const STORAGE_KEYS = {
    bookmarks: "zgm-bible-bookmarks",
    recents: "zgm-bible-recents",
    progress: "zgm-bible-progress",
    plans: "zgm-bible-reading-plans",
    lastReading: "zgm-bible-last-reading"
  };

  const SEARCH_PAGE_SIZE = 20;
  const RECENT_LIMIT = 12;
  const DEFAULT_BOOK_SLUG = "john";
  const DEFAULT_BOOK_CHAPTER = 1;

  const DEFAULT_PLANS = [
    {
      code: "one-year",
      title: "One Year Bible Journey",
      totalDays: 365,
      cadence: "Daily"
    },
    {
      code: "nt-90",
      title: "New Testament in 90 Days",
      totalDays: 90,
      cadence: "Daily"
    },
    {
      code: "psalms-proverbs-30",
      title: "Psalms & Proverbs in 30 Days",
      totalDays: 30,
      cadence: "Daily"
    }
  ];

  const SEARCH_SUGGESTIONS = ["grace", "faith", "hope", "love", "salvation", "Holy Spirit"];

  const state = {
    books: [],
    booksBySlug: new Map(),
    booksByNormalizedName: new Map(),
    testament: "ot",
    activeBookSlug: "",
    activeChapter: 0,
    activeVerse: 0,
    chapterVerses: [],
    chapterCache: new Map(),
    bookSearchCache: new Map(),
    recents: [],
    bookmarks: [],
    progress: {},
    plans: {},
    dailyVerses: [],
    dailyVerseIndex: 0,
    search: {
      query: "",
      scope: "all",
      results: [],
      page: 1
    },
    audio: {
      utterance: null,
      isPlaying: false,
      isPaused: false,
      verseIndex: 0,
      autoplay: false
    }
  };

  const ui = {};
  let progressFrame = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function safeJsonParse(value, fallback) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    return safeJsonParse(window.localStorage.getItem(key), fallback);
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_err) {
      // storage may be unavailable in private/restricted contexts
    }
  }

  function normalizeBookName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(sec / 60);
    const remain = sec % 60;
    return `${minutes}:${String(remain).padStart(2, "0")}`;
  }

  function getBookBySlug(bookSlug) {
    return state.booksBySlug.get(bookSlug) || null;
  }

  function keyForChapter(bookSlug, chapter) {
    return `${bookSlug}:${chapter}`;
  }

  function isHashRouteMode() {
    return window.location.protocol === "file:" || /bible\.html$/i.test(window.location.pathname);
  }

  function parseRoute() {
    const hash = String(window.location.hash || "").trim();
    const hashMatch = hash.match(/^#\/bible\/([^/]+)(?:\/(\d+))?(?:\/(\d+))?$/i);
    if (hashMatch) {
      return {
        bookSlug: decodeURIComponent(hashMatch[1]),
        chapter: Number(hashMatch[2] || 0),
        verse: Number(hashMatch[3] || 0)
      };
    }

    const cleanPath = window.location.pathname.replace(/\/+$/, "");
    const pathMatch = cleanPath.match(/\/bible\/([^/]+)(?:\/(\d+))?(?:\/(\d+))?$/i);
    if (pathMatch) {
      return {
        bookSlug: decodeURIComponent(pathMatch[1]),
        chapter: Number(pathMatch[2] || 0),
        verse: Number(pathMatch[3] || 0)
      };
    }

    return { bookSlug: "", chapter: 0, verse: 0 };
  }

  function updateRoute(bookSlug, chapter, verse) {
    if (!bookSlug || !chapter) return;

    const parts = ["bible", encodeURIComponent(bookSlug), String(chapter)];
    if (verse) parts.push(String(verse));

    if (isHashRouteMode()) {
      const target = `#/${parts.join("/")}`;
      if (window.location.hash !== target) {
        history.replaceState({}, "", target);
      }
      return;
    }

    const routePath = `/${parts.join("/")}`;
    if (window.location.pathname !== routePath) {
      history.replaceState({}, "", routePath);
    }
  }

  function parseBookPayload(payload, bookName) {
    const chapterMap = {};

    const pushChapter = (chapterNum, verses) => {
      const chapterKey = String(chapterNum || "").trim();
      if (!chapterKey) return;
      chapterMap[chapterKey] = chapterMap[chapterKey] || {};

      if (Array.isArray(verses)) {
        verses.forEach((item) => {
          if (!item) return;
          const verseKey = String(item.verse || item.number || "").trim();
          if (!verseKey) return;
          chapterMap[chapterKey][verseKey] = String(item.text || item.value || "");
        });
        return;
      }

      if (verses && typeof verses === "object") {
        Object.entries(verses).forEach(([verseNum, verseText]) => {
          chapterMap[chapterKey][String(verseNum)] = String(verseText || "");
        });
      }
    };

    if (!payload || typeof payload !== "object") return chapterMap;

    if (payload.book && Array.isArray(payload.chapters)) {
      payload.chapters.forEach((chapter) => {
        if (!chapter) return;
        pushChapter(chapter.chapter || chapter.number, chapter.verses || chapter.items || []);
      });
      return chapterMap;
    }

    if (payload.books && Array.isArray(payload.books)) {
      payload.books.forEach((book) => {
        if (book && book.book === bookName && Array.isArray(book.chapters)) {
          book.chapters.forEach((chapter) => pushChapter(chapter.chapter || chapter.number, chapter.verses || []));
        }
      });
      return chapterMap;
    }

    if (payload[bookName] && typeof payload[bookName] === "object") {
      Object.entries(payload[bookName]).forEach(([chapterNum, verses]) => pushChapter(chapterNum, verses));
      return chapterMap;
    }

    Object.entries(payload).forEach(([chapterNum, verses]) => {
      if (/^\d+$/.test(chapterNum)) pushChapter(chapterNum, verses);
    });

    return chapterMap;
  }

  async function fetchJson(path) {
    const response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }

  async function loadBooks() {
    const payload = await fetchJson("assets/data/bible-books.json");
    const books = Array.isArray(payload) ? payload : [];

    state.books = books;
    state.booksBySlug.clear();
    state.booksByNormalizedName.clear();

    books.forEach((book) => {
      state.booksBySlug.set(book.slug, book);
      state.booksByNormalizedName.set(normalizeBookName(book.name), book.slug);
    });
  }

  async function getChapterVerses(bookSlug, chapter) {
    const cacheKey = keyForChapter(bookSlug, chapter);
    if (state.chapterCache.has(cacheKey)) return state.chapterCache.get(cacheKey);

    let verses = [];

    try {
      const apiPayload = await fetchJson(`api/bible/${bookSlug}/${chapter}`);
      if (apiPayload && apiPayload.item && Array.isArray(apiPayload.item.verses)) {
        verses = apiPayload.item.verses.map((item) => ({
          verse: Number(item.verse),
          text: String(item.text || "")
        }));
      }
    } catch (_err) {
      const book = getBookBySlug(bookSlug);
      if (!book) throw new Error("Book not found");

      const raw = await fetchJson(`bible-data/${book.file}`);
      const chapterMap = parseBookPayload(raw, book.name);
      const selected = chapterMap[String(chapter)] || {};
      verses = Object.keys(selected)
        .map((verse) => Number(verse))
        .sort((a, b) => a - b)
        .map((verse) => ({ verse, text: String(selected[String(verse)] || "") }));
    }

    state.chapterCache.set(cacheKey, verses);
    return verses;
  }

  async function getBookSearchData(book) {
    if (!book) return [];
    if (state.bookSearchCache.has(book.slug)) return state.bookSearchCache.get(book.slug);

    const raw = await fetchJson(`bible-data/${book.file}`);
    const chapterMap = parseBookPayload(raw, book.name);
    const flattened = [];

    Object.keys(chapterMap)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((chapterNum) => {
        const verses = chapterMap[String(chapterNum)] || {};
        Object.keys(verses)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach((verseNum) => {
            flattened.push({
              book: book.name,
              bookSlug: book.slug,
              chapter: chapterNum,
              verse: verseNum,
              text: String(verses[String(verseNum)] || "")
            });
          });
      });

    state.bookSearchCache.set(book.slug, flattened);
    return flattened;
  }

  function hydrateState() {
    state.bookmarks = Array.isArray(readStorage(STORAGE_KEYS.bookmarks, [])) ? readStorage(STORAGE_KEYS.bookmarks, []) : [];
    state.recents = Array.isArray(readStorage(STORAGE_KEYS.recents, [])) ? readStorage(STORAGE_KEYS.recents, []) : [];
    state.progress = readStorage(STORAGE_KEYS.progress, {});
    state.plans = readStorage(STORAGE_KEYS.plans, {});

    DEFAULT_PLANS.forEach((plan) => {
      if (!state.plans[plan.code] || typeof state.plans[plan.code] !== "object") {
        state.plans[plan.code] = {
          completedDays: 0,
          updatedAt: Date.now()
        };
      }
    });
  }

  function persistState() {
    writeStorage(STORAGE_KEYS.bookmarks, state.bookmarks);
    writeStorage(STORAGE_KEYS.recents, state.recents);
    writeStorage(STORAGE_KEYS.progress, state.progress);
    writeStorage(STORAGE_KEYS.plans, state.plans);
  }

  function updateBreadcrumb() {
    const crumbs = ["Home", "Bible"];
    const book = getBookBySlug(state.activeBookSlug);
    if (book) crumbs.push(book.name);
    if (state.activeChapter) crumbs.push(`Chapter ${state.activeChapter}`);
    if (state.activeVerse) crumbs.push(`Verse ${state.activeVerse}`);
    ui.breadcrumb.textContent = crumbs.join(" > ");
  }

  function renderBookList() {
    const targetBooks = state.books.filter((book) => book.testament === state.testament);
    ui.bookList.innerHTML = "";

    targetBooks.forEach((book) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `book-item${book.slug === state.activeBookSlug ? " is-active" : ""}`;
      button.textContent = book.name;
      button.setAttribute("aria-label", `${book.name}, ${book.chapters} chapters`);
      button.addEventListener("click", () => {
        void openBook(book.slug);
      });
      ui.bookList.appendChild(button);
    });
  }

  function renderChapterGrid() {
    ui.chapterGrid.innerHTML = "";
    const book = getBookBySlug(state.activeBookSlug);
    if (!book) return;

    for (let chapter = 1; chapter <= Number(book.chapters); chapter += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `chapter-item${chapter === state.activeChapter ? " is-active" : ""}`;
      button.textContent = String(chapter);
      button.setAttribute("aria-label", `${book.name} chapter ${chapter}`);
      button.addEventListener("click", () => {
        void openChapter(book.slug, chapter);
      });
      ui.chapterGrid.appendChild(button);
    }
  }

  function renderRecents() {
    ui.recentList.innerHTML = "";
    if (!state.recents.length) {
      const empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "No recent chapters yet.";
      ui.recentList.appendChild(empty);
      return;
    }

    state.recents.slice(0, RECENT_LIMIT).forEach((item) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = item.slug === state.activeBookSlug && item.chapter === state.activeChapter ? "is-active" : "";
      button.textContent = `${item.book} ${item.chapter}`;
      button.addEventListener("click", () => {
        void openChapter(item.slug, item.chapter);
      });
      li.appendChild(button);
      ui.recentList.appendChild(li);
    });
  }

  function renderPlans() {
    ui.planList.innerHTML = "";

    DEFAULT_PLANS.forEach((plan) => {
      const progress = state.plans[plan.code] || { completedDays: 0 };
      const completedDays = Math.max(0, Math.min(Number(progress.completedDays || 0), plan.totalDays));
      const percent = Math.round((completedDays / plan.totalDays) * 100);

      const card = document.createElement("article");
      card.className = "plan-card";

      const title = document.createElement("h4");
      title.textContent = plan.title;

      const summary = document.createElement("p");
      summary.className = "muted";
      summary.textContent = `${completedDays}/${plan.totalDays} days • ${plan.cadence}`;

      const progressWrap = document.createElement("div");
      progressWrap.className = "plan-progress";
      progressWrap.setAttribute("role", "progressbar");
      progressWrap.setAttribute("aria-valuemin", "0");
      progressWrap.setAttribute("aria-valuemax", String(plan.totalDays));
      progressWrap.setAttribute("aria-valuenow", String(completedDays));
      progressWrap.setAttribute("aria-label", `${plan.title} progress`);

      const progressFill = document.createElement("span");
      progressFill.style.width = `${percent}%`;
      progressWrap.appendChild(progressFill);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = completedDays >= plan.totalDays ? "Completed" : "Mark Today Complete";
      button.disabled = completedDays >= plan.totalDays;
      button.addEventListener("click", () => {
        const nextCompleted = Math.min(plan.totalDays, completedDays + 1);
        state.plans[plan.code] = {
          completedDays: nextCompleted,
          updatedAt: Date.now()
        };
        persistState();
        renderPlans();
      });

      card.appendChild(title);
      card.appendChild(summary);
      card.appendChild(progressWrap);
      card.appendChild(button);
      ui.planList.appendChild(card);
    });
  }

  function renderQuickBookOptions() {
    ui.quickBook.innerHTML = "";
    state.books.forEach((book) => {
      const option = document.createElement("option");
      option.value = book.slug;
      option.textContent = book.name;
      ui.quickBook.appendChild(option);
    });
  }

  function renderQuickChapterOptions(bookSlug) {
    const book = getBookBySlug(bookSlug);
    ui.quickChapter.innerHTML = "";
    if (!book) return;

    for (let chapter = 1; chapter <= Number(book.chapters); chapter += 1) {
      const option = document.createElement("option");
      option.value = String(chapter);
      option.textContent = String(chapter);
      ui.quickChapter.appendChild(option);
    }
  }

  function syncQuickNav() {
    if (!state.activeBookSlug) return;
    if (ui.quickBook.value !== state.activeBookSlug) {
      ui.quickBook.value = state.activeBookSlug;
    }
    renderQuickChapterOptions(state.activeBookSlug);
    if (state.activeChapter) {
      ui.quickChapter.value = String(state.activeChapter);
    }
  }

  function updateChapterMeta() {
    const book = getBookBySlug(state.activeBookSlug);
    if (!book || !state.activeChapter) {
      ui.chapterTitle.textContent = "Select a chapter";
      ui.chapterMeta.textContent = "Choose a book and chapter from the index.";
      return;
    }

    const bookmarkCount = state.bookmarks.filter((item) => item.bookSlug === state.activeBookSlug && item.chapter === state.activeChapter).length;
    ui.chapterTitle.textContent = `${book.name} ${state.activeChapter}`;
    ui.chapterMeta.textContent = `${state.chapterVerses.length} verses • ${bookmarkCount} bookmarks in this chapter`;
  }

  function highlightActiveVerse() {
    const verseLines = ui.chapterView.querySelectorAll(".verse-line");
    verseLines.forEach((line) => {
      const verseNum = Number(line.getAttribute("data-verse") || 0);
      line.classList.toggle("is-speaking", verseNum === state.activeVerse);
    });
  }

  function renderChapter() {
    ui.chapterView.innerHTML = "";

    if (!state.chapterVerses.length) {
      ui.chapterView.innerHTML = '<p class="muted">No verses found for this chapter.</p>';
      updateChapterMeta();
      return;
    }

    const fragment = document.createDocumentFragment();
    state.chapterVerses.forEach((verseObj) => {
      const line = document.createElement("p");
      line.className = "verse-line";
      line.setAttribute("data-verse", String(verseObj.verse));

      const tag = document.createElement("button");
      tag.type = "button";
      tag.className = "verse-tag";
      tag.textContent = String(verseObj.verse);
      tag.setAttribute("aria-label", `Open verse ${verseObj.verse}`);
      tag.addEventListener("click", () => {
        openVerseModal(verseObj.verse);
      });

      const textNode = document.createTextNode(verseObj.text);

      line.appendChild(tag);
      line.appendChild(textNode);
      fragment.appendChild(line);
    });

    ui.chapterView.appendChild(fragment);

    const progressKey = keyForChapter(state.activeBookSlug, state.activeChapter);
    const savedProgress = state.progress[progressKey];
    if (savedProgress && typeof savedProgress.scrollPct === "number") {
      const maxScroll = Math.max(1, ui.chapterView.scrollHeight - ui.chapterView.clientHeight);
      ui.chapterView.scrollTop = Math.round((savedProgress.scrollPct / 100) * maxScroll);
    } else {
      ui.chapterView.scrollTop = 0;
    }

    updateChapterMeta();
    updateReadingProgress();
    highlightActiveVerse();
  }

  function addRecent(bookSlug, chapter) {
    const book = getBookBySlug(bookSlug);
    if (!book || !chapter) return;

    const nextItem = {
      slug: bookSlug,
      book: book.name,
      chapter,
      ts: Date.now()
    };

    const filtered = state.recents.filter((item) => !(item.slug === bookSlug && item.chapter === chapter));
    state.recents = [nextItem, ...filtered].slice(0, RECENT_LIMIT);
  }

  function saveLastReading(bookSlug, chapter) {
    writeStorage(STORAGE_KEYS.lastReading, {
      bookSlug,
      chapter,
      updatedAt: Date.now()
    });
  }

  function updateReadingProgress() {
    const maxScroll = Math.max(1, ui.chapterView.scrollHeight - ui.chapterView.clientHeight);
    const scrollPct = Math.max(0, Math.min(100, (ui.chapterView.scrollTop / maxScroll) * 100));
    ui.readingProgressBar.style.width = `${scrollPct.toFixed(2)}%`;

    if (!state.activeBookSlug || !state.activeChapter) return;

    const progressKey = keyForChapter(state.activeBookSlug, state.activeChapter);
    state.progress[progressKey] = {
      scrollPct: Number(scrollPct.toFixed(2)),
      updatedAt: Date.now()
    };
    persistState();
  }

  function scheduleProgressUpdate() {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(() => {
      progressFrame = 0;
      updateReadingProgress();
    });
  }

  function showSearchSuggestions() {
    ui.searchSuggestions.innerHTML = "";
    SEARCH_SUGGESTIONS.forEach((term) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = term;
      button.addEventListener("click", () => {
        ui.searchInput.value = term;
        void executeSearch();
      });
      ui.searchSuggestions.appendChild(button);
    });
  }

  function highlightTerm(text, query) {
    if (!query) return escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "ig");
    return escapeHtml(text).replace(regex, "<mark>$1</mark>");
  }

  function getSearchPage() {
    const start = (state.search.page - 1) * SEARCH_PAGE_SIZE;
    return state.search.results.slice(start, start + SEARCH_PAGE_SIZE);
  }

  function renderSearchResults() {
    ui.searchResults.innerHTML = "";

    const total = state.search.results.length;
    const pages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
    state.search.page = Math.min(Math.max(1, state.search.page), pages);
    const pageItems = getSearchPage();

    ui.searchPageInfo.textContent = `Page ${state.search.page} of ${pages}`;
    ui.searchPrev.disabled = state.search.page <= 1;
    ui.searchNext.disabled = state.search.page >= pages;

    if (!pageItems.length) {
      ui.searchResults.innerHTML = '<p class="muted">No results found. Try another search phrase.</p>';
      return;
    }

    pageItems.forEach((result) => {
      const item = document.createElement("article");
      item.className = "search-result";

      const ref = document.createElement("h3");
      ref.textContent = `${result.book} ${result.chapter}:${result.verse}`;

      const text = document.createElement("p");
      text.innerHTML = highlightTerm(result.text, state.search.query);

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "btn bible-btn-soft";
      openBtn.textContent = "Open Passage";
      openBtn.addEventListener("click", () => {
        void openChapter(result.bookSlug, result.chapter, { verse: result.verse, focusVerse: true });
      });

      item.appendChild(ref);
      item.appendChild(text);
      item.appendChild(openBtn);
      ui.searchResults.appendChild(item);
    });
  }

  function parseReferenceQuery(query) {
    const match = String(query || "")
      .trim()
      .match(/^([1-3]?\s*[A-Za-z\s]+)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;

    const rawBook = normalizeBookName(match[1]);
    const slug = state.booksByNormalizedName.get(rawBook) || "";
    if (!slug) return null;

    return {
      bookSlug: slug,
      chapter: Number(match[2]),
      verse: Number(match[3] || 0)
    };
  }

  async function executeSearch() {
    const query = String(ui.searchInput.value || "").trim();
    const scope = String(ui.searchScope.value || "all").toLowerCase();
    state.search.query = query;
    state.search.scope = scope;
    state.search.page = 1;

    if (!query) {
      state.search.results = [];
      renderSearchResults();
      return;
    }

    const directRef = parseReferenceQuery(query);
    if (directRef) {
      await openChapter(directRef.bookSlug, directRef.chapter, {
        verse: directRef.verse,
        focusVerse: Boolean(directRef.verse)
      });
      return;
    }

    ui.searchResults.innerHTML = '<p class="muted">Searching the Bible...</p>';
    const queryLower = query.toLowerCase();

    const scopeBooks = state.books.filter((book) => {
      if (scope === "ot") return book.testament === "ot";
      if (scope === "nt") return book.testament === "nt";
      return true;
    });

    const hits = [];
    for (const book of scopeBooks) {
      const verses = await getBookSearchData(book);
      verses.forEach((entry) => {
        if (entry.text.toLowerCase().includes(queryLower)) {
          hits.push(entry);
        }
      });
    }

    state.search.results = hits;
    renderSearchResults();
  }

  function closeVerseModal() {
    ui.verseModal.hidden = true;
  }

  function getVerseRecord(verseNum) {
    return state.chapterVerses.find((entry) => entry.verse === verseNum) || null;
  }

  function renderVerseModal() {
    const book = getBookBySlug(state.activeBookSlug);
    const verse = getVerseRecord(state.activeVerse);
    if (!book || !verse) return;

    ui.verseModalTitle.textContent = `${book.name} ${state.activeChapter}:${state.activeVerse}`;
    ui.verseModalText.textContent = verse.text;
  }

  function openVerseModal(verseNum) {
    const candidate = getVerseRecord(verseNum);
    if (!candidate) return;
    state.activeVerse = verseNum;
    renderVerseModal();
    highlightActiveVerse();
    updateBreadcrumb();
    updateRoute(state.activeBookSlug, state.activeChapter, state.activeVerse);
    ui.verseModal.hidden = false;
  }

  async function copyText(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (_err) {
      // ignore clipboard failures silently
    }
  }

  function buildCurrentReference(verseNum) {
    const book = getBookBySlug(state.activeBookSlug);
    if (!book) return "";
    if (verseNum) return `${book.name} ${state.activeChapter}:${verseNum}`;
    return `${book.name} ${state.activeChapter}`;
  }

  async function shareReference(verseNum) {
    const reference = buildCurrentReference(verseNum);
    const verse = verseNum ? getVerseRecord(verseNum) : null;
    const text = verse ? `${reference} - ${verse.text}` : reference;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Bible Reading",
          text,
          url: window.location.href
        });
        return;
      } catch (_err) {
        // fallback to copy below
      }
    }

    await copyText(`${text}\n${window.location.href}`);
  }

  function toggleBookmark(verseNum) {
    const payload = {
      bookSlug: state.activeBookSlug,
      chapter: state.activeChapter,
      verse: Number(verseNum || 0) || null,
      ts: Date.now()
    };

    const existingIndex = state.bookmarks.findIndex((item) =>
      item.bookSlug === payload.bookSlug &&
      Number(item.chapter) === Number(payload.chapter) &&
      Number(item.verse || 0) === Number(payload.verse || 0)
    );

    if (existingIndex >= 0) {
      state.bookmarks.splice(existingIndex, 1);
    } else {
      state.bookmarks.unshift(payload);
      state.bookmarks = state.bookmarks.slice(0, 200);
    }

    persistState();
    updateChapterMeta();
  }

  function getNextChapter(bookSlug, chapter, direction) {
    const currentBook = getBookBySlug(bookSlug);
    if (!currentBook) return null;

    const currentChapter = Number(chapter);
    if (direction > 0 && currentChapter < Number(currentBook.chapters)) {
      return { bookSlug, chapter: currentChapter + 1 };
    }
    if (direction < 0 && currentChapter > 1) {
      return { bookSlug, chapter: currentChapter - 1 };
    }

    const currentBookIndex = state.books.findIndex((book) => book.slug === bookSlug);
    if (currentBookIndex < 0) return null;

    const nextBookIndex = currentBookIndex + direction;
    const nextBook = state.books[nextBookIndex];
    if (!nextBook) return null;

    return {
      bookSlug: nextBook.slug,
      chapter: direction > 0 ? 1 : Number(nextBook.chapters)
    };
  }

  function stopAudio() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    state.audio.utterance = null;
    state.audio.isPlaying = false;
    state.audio.isPaused = false;
    state.audio.verseIndex = 0;
    ui.audioStatus.textContent = "Ready.";
    ui.audioProgress.style.width = "0%";
    ui.audioDuration.textContent = "0:00 / 0:00";
  }

  function updateAudioMeters() {
    if (!state.chapterVerses.length) {
      ui.audioProgress.style.width = "0%";
      ui.audioDuration.textContent = "0:00 / 0:00";
      return;
    }

    const speed = Math.max(0.5, Number(ui.audioSpeed.value || 1));
    const totalWords = state.chapterVerses.reduce((sum, verse) => sum + String(verse.text || "").split(/\s+/).filter(Boolean).length, 0);
    const estimatedDuration = totalWords / (2.8 * speed);
    const currentPosition = Math.max(0, Math.min(state.audio.verseIndex, state.chapterVerses.length));
    const pct = (currentPosition / state.chapterVerses.length) * 100;
    const currentTime = estimatedDuration * (pct / 100);

    ui.audioProgress.style.width = `${pct.toFixed(2)}%`;
    ui.audioDuration.textContent = `${formatTime(currentTime)} / ${formatTime(estimatedDuration)}`;
  }

  function speakVerseAt(index) {
    if (!window.speechSynthesis) return;
    if (!state.chapterVerses.length) return;

    if (index >= state.chapterVerses.length) {
      state.audio.isPlaying = false;
      state.audio.isPaused = false;
      state.audio.utterance = null;
      state.audio.verseIndex = state.chapterVerses.length;
      updateAudioMeters();
      ui.audioStatus.textContent = "Chapter complete.";

      if (state.audio.autoplay) {
        const next = getNextChapter(state.activeBookSlug, state.activeChapter, 1);
        if (next) {
          void openChapter(next.bookSlug, next.chapter).then(() => {
            playAudio();
          });
        }
      }
      return;
    }

    state.audio.verseIndex = index;
    const verseRecord = state.chapterVerses[index];
    state.activeVerse = verseRecord.verse;
    highlightActiveVerse();
    updateBreadcrumb();
    updateRoute(state.activeBookSlug, state.activeChapter, state.activeVerse);

    const utterance = new SpeechSynthesisUtterance(verseRecord.text);
    utterance.rate = Math.max(0.5, Math.min(2, Number(ui.audioSpeed.value || 1)));
    utterance.onstart = () => {
      state.audio.isPlaying = true;
      state.audio.isPaused = false;
      ui.audioStatus.textContent = `Reading verse ${verseRecord.verse}...`;
      updateAudioMeters();
    };
    utterance.onend = () => {
      if (!state.audio.isPlaying || state.audio.isPaused) return;
      speakVerseAt(index + 1);
    };
    utterance.onerror = () => {
      ui.audioStatus.textContent = "Audio playback interrupted.";
      state.audio.isPlaying = false;
      state.audio.isPaused = false;
      updateAudioMeters();
    };

    state.audio.utterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function playAudio() {
    if (!window.speechSynthesis) {
      ui.audioStatus.textContent = "Text-to-speech is not supported in this browser.";
      return;
    }
    if (!state.chapterVerses.length) {
      ui.audioStatus.textContent = "Open a chapter first.";
      return;
    }

    if (state.audio.isPaused) {
      state.audio.isPaused = false;
      state.audio.isPlaying = true;
      window.speechSynthesis.resume();
      ui.audioStatus.textContent = "Resumed.";
      return;
    }

    window.speechSynthesis.cancel();
    state.audio.isPlaying = true;
    state.audio.isPaused = false;
    state.audio.verseIndex = 0;
    speakVerseAt(0);
  }

  function pauseAudio() {
    if (!window.speechSynthesis || !state.audio.isPlaying) return;
    window.speechSynthesis.pause();
    state.audio.isPaused = true;
    state.audio.isPlaying = false;
    ui.audioStatus.textContent = "Paused.";
  }

  async function openBook(bookSlug) {
    const book = getBookBySlug(bookSlug);
    if (!book) return;

    state.activeBookSlug = bookSlug;
    state.testament = book.testament;
    state.activeVerse = 0;

    renderBookList();
    renderChapterGrid();
    syncQuickNav();
    updateBreadcrumb();
  }

  async function openChapter(bookSlug, chapter, options = {}) {
    const book = getBookBySlug(bookSlug);
    if (!book) return;

    const safeChapter = Math.max(1, Math.min(Number(chapter || 1), Number(book.chapters)));

    state.activeBookSlug = bookSlug;
    state.activeChapter = safeChapter;
    state.activeVerse = Number(options.verse || 0);

    state.chapterVerses = await getChapterVerses(bookSlug, safeChapter);

    stopAudio();
    renderBookList();
    renderChapterGrid();
    syncQuickNav();
    renderChapter();
    addRecent(bookSlug, safeChapter);
    renderRecents();
    saveLastReading(bookSlug, safeChapter);
    persistState();
    updateBreadcrumb();
    updateRoute(bookSlug, safeChapter, state.activeVerse);

    if (options.focusVerse && state.activeVerse) {
      const verseElement = ui.chapterView.querySelector(`.verse-line[data-verse=\"${state.activeVerse}\"]`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightActiveVerse();
      }
    }
  }

  async function continueReading() {
    const saved = readStorage(STORAGE_KEYS.lastReading, null);
    if (saved && saved.bookSlug && saved.chapter) {
      await openChapter(saved.bookSlug, Number(saved.chapter));
      return;
    }

    if (state.recents.length) {
      await openChapter(state.recents[0].slug, Number(state.recents[0].chapter));
      return;
    }

    await openChapter(DEFAULT_BOOK_SLUG, DEFAULT_BOOK_CHAPTER);
  }

  async function openRandomChapter() {
    if (!state.books.length) return;
    const book = state.books[Math.floor(Math.random() * state.books.length)];
    const chapter = Math.floor(Math.random() * Number(book.chapters)) + 1;
    await openChapter(book.slug, chapter);
  }

  async function loadDailyVerses() {
    try {
      const payload = await fetchJson("assets/data/verses.json");
      state.dailyVerses = Array.isArray(payload) ? payload : [];
    } catch (_err) {
      state.dailyVerses = [];
    }
  }

  function renderDailyVerse(indexOverride) {
    if (!state.dailyVerses.length) {
      ui.dailyVerseRef.textContent = "Verse unavailable";
      ui.dailyVerseText.textContent = "Daily verse could not be loaded at this time.";
      return;
    }

    if (typeof indexOverride === "number") {
      state.dailyVerseIndex = Math.max(0, Math.min(indexOverride, state.dailyVerses.length - 1));
    } else {
      const now = new Date();
      const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
      state.dailyVerseIndex = dayOfYear % state.dailyVerses.length;
    }

    const verse = state.dailyVerses[state.dailyVerseIndex];
    ui.dailyVerseRef.textContent = verse.reference || "Daily Verse";
    ui.dailyVerseText.textContent = verse.text || "";
  }

  async function initializeRoute() {
    const route = parseRoute();
    const hasBook = Boolean(route.bookSlug && getBookBySlug(route.bookSlug));
    if (hasBook && route.chapter > 0) {
      await openChapter(route.bookSlug, route.chapter, {
        verse: route.verse,
        focusVerse: Boolean(route.verse)
      });
      return;
    }

    await continueReading();
  }

  function bindUi() {
    ui.quickBook = $("quickBook");
    ui.quickChapter = $("quickChapter");
    ui.quickGo = $("quickGo");
    ui.breadcrumb = $("breadcrumb");
    ui.showOT = $("showOT");
    ui.showNT = $("showNT");
    ui.bookList = $("bookList");
    ui.chapterGrid = $("chapterGrid");
    ui.recentList = $("recentList");
    ui.planList = $("planList");
    ui.chapterTitle = $("chapterTitle");
    ui.chapterMeta = $("chapterMeta");
    ui.prevChapter = $("prevChapter");
    ui.nextChapter = $("nextChapter");
    ui.bookmarkChapter = $("bookmarkChapter");
    ui.readingProgressBar = $("readingProgressBar");
    ui.chapterView = $("chapterView");
    ui.scrollTopBtn = $("scrollTopBtn");

    ui.searchInput = $("searchInput");
    ui.searchScope = $("searchScope");
    ui.searchBtn = $("searchBtn");
    ui.searchSuggestions = $("searchSuggestions");
    ui.searchResults = $("searchResults");
    ui.searchPrev = $("searchPrev");
    ui.searchNext = $("searchNext");
    ui.searchPageInfo = $("searchPageInfo");

    ui.audioPlay = $("audioPlay");
    ui.audioPause = $("audioPause");
    ui.audioStop = $("audioStop");
    ui.audioPrev = $("audioPrev");
    ui.audioNext = $("audioNext");
    ui.audioProgress = $("audioProgress");
    ui.audioDuration = $("audioDuration");
    ui.audioSpeed = $("audioSpeed");
    ui.audioAutoplay = $("audioAutoplay");
    ui.audioStatus = $("audioStatus");

    ui.verseModal = $("verseModal");
    ui.closeVerseModal = $("closeVerseModal");
    ui.verseModalTitle = $("verseModalTitle");
    ui.verseModalText = $("verseModalText");
    ui.versePrev = $("versePrev");
    ui.verseNext = $("verseNext");
    ui.verseCopy = $("verseCopy");
    ui.verseShare = $("verseShare");
    ui.verseBookmark = $("verseBookmark");
    ui.shareButtons = Array.from(document.querySelectorAll("[data-share-channel]"));

    ui.continueReadingHero = $("continueReadingHero");
    ui.randomChapterHero = $("randomChapterHero");
    ui.dailyVerseRef = $("dailyVerseRef");
    ui.dailyVerseText = $("dailyVerseText");
    ui.dailyCopy = $("dailyCopy");
    ui.dailyShare = $("dailyShare");
    ui.dailyRefresh = $("dailyRefresh");
  }

  function wireEvents() {
    ui.showOT.addEventListener("click", () => {
      state.testament = "ot";
      ui.showOT.classList.add("is-active");
      ui.showNT.classList.remove("is-active");
      ui.showOT.setAttribute("aria-selected", "true");
      ui.showNT.setAttribute("aria-selected", "false");
      renderBookList();
    });

    ui.showNT.addEventListener("click", () => {
      state.testament = "nt";
      ui.showNT.classList.add("is-active");
      ui.showOT.classList.remove("is-active");
      ui.showNT.setAttribute("aria-selected", "true");
      ui.showOT.setAttribute("aria-selected", "false");
      renderBookList();
    });

    ui.quickBook.addEventListener("change", () => {
      renderQuickChapterOptions(ui.quickBook.value);
    });

    ui.quickGo.addEventListener("click", () => {
      const selectedBook = ui.quickBook.value;
      const selectedChapter = Number(ui.quickChapter.value || 1);
      void openChapter(selectedBook, selectedChapter);
    });

    ui.prevChapter.addEventListener("click", () => {
      const prev = getNextChapter(state.activeBookSlug, state.activeChapter, -1);
      if (prev) void openChapter(prev.bookSlug, prev.chapter);
    });

    ui.nextChapter.addEventListener("click", () => {
      const next = getNextChapter(state.activeBookSlug, state.activeChapter, 1);
      if (next) void openChapter(next.bookSlug, next.chapter);
    });

    ui.bookmarkChapter.addEventListener("click", () => {
      toggleBookmark(0);
    });

    ui.scrollTopBtn.addEventListener("click", () => {
      ui.chapterView.scrollTo({ top: 0, behavior: "smooth" });
    });

    ui.chapterView.addEventListener("scroll", scheduleProgressUpdate);

    ui.searchBtn.addEventListener("click", () => {
      void executeSearch();
    });

    ui.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void executeSearch();
      }
    });

    ui.searchPrev.addEventListener("click", () => {
      state.search.page -= 1;
      renderSearchResults();
    });

    ui.searchNext.addEventListener("click", () => {
      state.search.page += 1;
      renderSearchResults();
    });

    ui.audioPlay.addEventListener("click", playAudio);
    ui.audioPause.addEventListener("click", pauseAudio);
    ui.audioStop.addEventListener("click", stopAudio);
    ui.audioPrev.addEventListener("click", () => {
      const prev = getNextChapter(state.activeBookSlug, state.activeChapter, -1);
      if (prev) void openChapter(prev.bookSlug, prev.chapter);
    });
    ui.audioNext.addEventListener("click", () => {
      const next = getNextChapter(state.activeBookSlug, state.activeChapter, 1);
      if (next) void openChapter(next.bookSlug, next.chapter);
    });
    ui.audioSpeed.addEventListener("change", updateAudioMeters);
    ui.audioAutoplay.addEventListener("change", () => {
      state.audio.autoplay = Boolean(ui.audioAutoplay.checked);
    });

    ui.closeVerseModal.addEventListener("click", closeVerseModal);
    ui.verseModal.addEventListener("click", (event) => {
      if (event.target === ui.verseModal) closeVerseModal();
    });

    ui.versePrev.addEventListener("click", () => {
      const prev = Math.max(1, state.activeVerse - 1);
      openVerseModal(prev);
    });

    ui.verseNext.addEventListener("click", () => {
      const maxVerse = state.chapterVerses.length;
      const next = Math.min(maxVerse, state.activeVerse + 1);
      openVerseModal(next);
    });

    ui.verseCopy.addEventListener("click", () => {
      const verse = getVerseRecord(state.activeVerse);
      if (!verse) return;
      const text = `${buildCurrentReference(state.activeVerse)} - ${verse.text}`;
      void copyText(text);
    });

    ui.verseShare.addEventListener("click", () => {
      void shareReference(state.activeVerse);
    });

    ui.verseBookmark.addEventListener("click", () => {
      toggleBookmark(state.activeVerse);
    });

    ui.shareButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const channel = button.getAttribute("data-share-channel");
        const verse = getVerseRecord(state.activeVerse);
        const text = encodeURIComponent(`${buildCurrentReference(state.activeVerse)} - ${verse ? verse.text : ""}`);
        const url = encodeURIComponent(window.location.href);

        if (channel === "copy") {
          void copyText(`${decodeURIComponent(text)}\n${window.location.href}`);
          return;
        }

        if (channel === "whatsapp") {
          window.open(`https://wa.me/?text=${text}%20${url}`, "_blank", "noopener");
          return;
        }

        if (channel === "telegram") {
          window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener");
          return;
        }

        if (channel === "facebook") {
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener");
          return;
        }

        if (channel === "x") {
          window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener");
        }
      });
    });

    ui.continueReadingHero.addEventListener("click", () => {
      void continueReading();
    });

    ui.randomChapterHero.addEventListener("click", () => {
      void openRandomChapter();
    });

    ui.dailyCopy.addEventListener("click", () => {
      const value = `${ui.dailyVerseRef.textContent} - ${ui.dailyVerseText.textContent}`;
      void copyText(value);
    });

    ui.dailyShare.addEventListener("click", () => {
      void shareReference(0);
    });

    ui.dailyRefresh.addEventListener("click", () => {
      if (!state.dailyVerses.length) return;
      const next = Math.floor(Math.random() * state.dailyVerses.length);
      renderDailyVerse(next);
    });

    window.addEventListener("hashchange", () => {
      const route = parseRoute();
      if (route.bookSlug && route.chapter) {
        void openChapter(route.bookSlug, route.chapter, {
          verse: route.verse,
          focusVerse: Boolean(route.verse)
        });
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !ui.verseModal.hidden) {
        closeVerseModal();
      }
    });
  }

  async function init() {
    bindUi();
    hydrateState();
    renderPlans();
    showSearchSuggestions();

    await loadBooks();
    renderQuickBookOptions();

    wireEvents();
    await loadDailyVerses();
    renderDailyVerse();

    await initializeRoute();

    renderRecents();
    renderPlans();
  }

  document.addEventListener("DOMContentLoaded", () => {
    void init();
  });
})()

