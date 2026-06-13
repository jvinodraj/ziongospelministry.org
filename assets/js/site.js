const bySel = (sel, root = document) => root.querySelector(sel);
const bySelAll = (sel, root = document) => Array.from(root.querySelectorAll(sel));

async function getJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    return await res.json();
  } catch (_err) {
    return [];
  }
}

function setYear() {
  bySelAll("#year").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

function initTheme() {
  const btn = bySel("[data-theme-toggle]");
  if (!btn) return;

  const saved = localStorage.getItem("zgm-theme");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    btn.textContent = "Light Mode";
  }

  btn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("zgm-theme", "light");
      btn.textContent = "Dark Mode";
      return;
    }
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("zgm-theme", "dark");
    btn.textContent = "Light Mode";
  });
}

function initMenu() {
  const btn = bySel("[data-menu-toggle]");
  const nav = bySel("#main-nav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function initReveal() {
  const items = bySelAll(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  items.forEach((el) => io.observe(el));
}

function setFormMessage(form, msg) {
  const slot = bySel("[data-form-message]", form);
  if (slot) slot.textContent = msg;
}

function initSimpleForms() {
  bySelAll("form[data-generic-form], form[data-newsletter-form], form[data-prayer-form], form[data-testimony-form], form[data-member-login]").forEach((form) => {
    if (form.hasAttribute("data-email-submit")) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      setFormMessage(form, "Thank you. Your submission has been received.");
      form.reset();
    });
  });
}

function resolveApiEndpoint(form) {
  const action = String(form.getAttribute("action") || "").trim();
  if (/^https?:\/\//i.test(action)) return action;

  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const devBase = String(form.getAttribute("data-api-dev") || "").trim();
  const prodBase = String(form.getAttribute("data-api-prod") || "").trim();
  const envBase = isLocal ? devBase : prodBase;

  if (!envBase) return action;
  return new URL(action, envBase.endsWith("/") ? envBase : `${envBase}/`).toString();
}

function initEmailApiForms() {
  bySelAll("form[data-email-submit]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = bySel('button[type="submit"]', form);
      const originalBtnText = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      const fd = new FormData(form);
      const payload = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        subject: String(fd.get("subject") || "").trim(),
        message: String(fd.get("message") || "").trim()
      };
      const endpoint = resolveApiEndpoint(form);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error("Failed to submit message.");
        }

        setFormMessage(form, "Thank you. Your message has been sent.");
        form.reset();
      } catch (_err) {
        setFormMessage(form, "Unable to send right now. Please try again shortly.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  });
}

function renderHomeEvents(events) {
  const root = bySel("[data-home-events]");
  if (!root) return;
  root.innerHTML = "";
  events.slice(0, 3).forEach((event) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<h3>${event.title}</h3><p class="muted">${event.date} | ${event.time}</p><p>${event.location}</p><span class="chip">${event.category}</span>`;
    root.appendChild(card);
  });
}

function renderEventsPage(events) {
  const list = bySel("[data-events-list]");
  if (list) {
    list.innerHTML = "";
    events.forEach((event) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<h3>${event.title}</h3><p class="muted">${event.date} | ${event.time}</p><p>${event.location}</p><span class="chip">${event.category}</span>`;
      list.appendChild(card);
    });
  }

  const cal = bySel("[data-events-calendar]");
  if (!cal) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const byDay = new Map();

  events.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(e.title);
    }
  });

  cal.innerHTML = "";
  for (let day = 1; day <= days; day += 1) {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    const items = byDay.get(day) || [];
    cell.innerHTML = `<strong>${day}</strong>${items.slice(0, 2).map((x) => `<div>${x}</div>`).join("")}`;
    cal.appendChild(cell);
  }
}

function renderSermonCard(item) {
  return `<h3>${item.title}</h3><p class="muted">${item.date} | ${item.speaker}</p><p>${item.passage}</p><div><span class="chip">${item.topic}</span><span class="chip">${item.type}</span></div><p><a href="${item.media}" target="_blank" rel="noopener">Open Media</a> | <a href="${item.notes}" target="_blank" rel="noopener">Sermon Notes</a></p>`;
}

function renderHomeSermons(sermons) {
  const root = bySel("[data-home-sermons]");
  if (!root) return;
  root.innerHTML = "";
  sermons.slice(0, 3).forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = renderSermonCard(item);
    root.appendChild(card);
  });
}

function initSermons(sermons) {
  const list = bySel("[data-sermon-list]");
  if (!list) return;

  const search = bySel("[data-sermon-search]");
  const speaker = bySel("[data-sermon-speaker]");
  const topic = bySel("[data-sermon-topic]");
  const passage = bySel("[data-sermon-passage]");
  const month = bySel("[data-sermon-month]");

  const speakers = [...new Set(sermons.map((s) => s.speaker))];
  speakers.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    speaker.appendChild(opt);
  });

  const topics = [...new Set(sermons.map((s) => s.topic))];
  topics.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    topic.appendChild(opt);
  });

  function applyFilters() {
    const q = (search.value || "").trim().toLowerCase();
    const sp = speaker.value;
    const tp = topic.value;
    const ps = (passage.value || "").trim().toLowerCase();
    const mo = month.value;

    const filtered = sermons.filter((item) => {
      if (q && !(item.title.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q))) return false;
      if (sp && item.speaker !== sp) return false;
      if (tp && item.topic !== tp) return false;
      if (ps && !item.passage.toLowerCase().includes(ps)) return false;
      if (mo && !item.date.startsWith(mo)) return false;
      return true;
    });

    list.innerHTML = "";
    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = renderSermonCard(item);
      list.appendChild(card);
    });

    if (!filtered.length) {
      list.innerHTML = '<article class="card"><p class="muted">No sermons match your filters.</p></article>';
    }
  }

  [search, speaker, topic, passage, month].forEach((el) => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  applyFilters();
}

function initStudies(studies) {
  const list = bySel("[data-study-list]");
  if (!list) return;

  const search = bySel("[data-study-search]");
  const category = bySel("[data-study-category]");
  const series = bySel("[data-study-series]");
  const format = bySel("[data-study-format]");

  [...new Set(studies.map((x) => x.category))].forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    category.appendChild(opt);
  });

  function draw() {
    const q = (search.value || "").toLowerCase();
    const c = category.value;
    const s = (series.value || "").toLowerCase();
    const f = (format.value || "").toLowerCase();

    const filtered = studies.filter((item) => {
      if (q && !(item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q))) return false;
      if (c && item.category !== c) return false;
      if (s && !item.series.toLowerCase().includes(s)) return false;
      if (f && !item.format.toLowerCase().includes(f)) return false;
      return true;
    });

    list.innerHTML = "";
    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<h3>${item.title}</h3><p class="muted">${item.series}</p><p>${item.summary}</p><div><span class="chip">${item.category}</span><span class="chip">${item.format}</span></div>`;
      list.appendChild(card);
    });
  }

  [search, category, series, format].forEach((el) => {
    el.addEventListener("input", draw);
    el.addEventListener("change", draw);
  });

  draw();
}

function renderDevotions(devotions) {
  const root = bySel("[data-devotional-list]");
  if (!root) return;
  root.innerHTML = "";
  devotions.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<h3>${item.title}</h3><p class="muted">${item.scripture}</p><p>${item.reflection}</p>`;
    root.appendChild(card);
  });
}

function renderMissions(missions) {
  const root = bySel("[data-missions-list]");
  if (!root) return;
  root.innerHTML = "";
  missions.forEach((m) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<h3>${m.name}</h3><span class="chip">${m.focus}</span><p>${m.description}</p>`;
    root.appendChild(card);
  });
}

function renderPrayerWall(items) {
  const root = bySel("[data-prayer-wall]");
  if (!root) return;
  root.innerHTML = "";
  items.filter((x) => x.approved).forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<h3>${item.name}</h3><p>${item.request}</p>`;
    root.appendChild(card);
  });
}

const EN_TO_TA_BOOK = {
  "Genesis": "ஆதியாகமம்",
  "Exodus": "யாத்திராகமம்",
  "Leviticus": "லேவியராகமம்",
  "Numbers": "எண்ணாகமம்",
  "Deuteronomy": "உபாகமம்",
  "Joshua": "யோசுவா",
  "Judges": "நியாயாதிபதிகள்",
  "Ruth": "ரூத்",
  "1 Samuel": "1 சாமுவேல்",
  "2 Samuel": "2 சாமுவேல்",
  "1 Kings": "1 இராஜாக்கள்",
  "2 Kings": "2 இராஜாக்கள்",
  "1 Chronicles": "1 நாளாகமம்",
  "2 Chronicles": "2 நாளாகமம்",
  "Ezra": "எஸ்றா",
  "Nehemiah": "நெகேமியா",
  "Esther": "எஸ்தர்",
  "Job": "யோபு",
  "Psalms": "சங்கீதம்",
  "Proverbs": "நீதிமொழிகள்",
  "Ecclesiastes": "பிரசங்கி",
  "Song of Solomon": "உன்னதப்பாட்டு",
  "Isaiah": "ஏசாயா",
  "Jeremiah": "எரேமியா",
  "Lamentations": "புலம்பல்",
  "Ezekiel": "எசேக்கியேல்",
  "Daniel": "தானியேல்",
  "Hosea": "ஓசியா",
  "Joel": "யோவேல்",
  "Amos": "ஆமோஸ்",
  "Obadiah": "ஒபதியா",
  "Jonah": "யோனா",
  "Micah": "மீகா",
  "Nahum": "நாகூம்",
  "Habakkuk": "ஆபகூக்",
  "Zephaniah": "செப்பனியா",
  "Haggai": "ஆகாய்",
  "Zechariah": "சகரியா",
  "Malachi": "மல்கியா",
  "Matthew": "மத்தேயு",
  "Mark": "மாற்கு",
  "Luke": "லூக்கா",
  "John": "யோவான்",
  "Acts": "அப்போஸ்தலர்",
  "Romans": "ரோமர்",
  "1 Corinthians": "1 கொரிந்தியர்",
  "2 Corinthians": "2 கொரிந்தியர்",
  "Galatians": "கலாத்தியர்",
  "Ephesians": "எபேசியர்",
  "Philippians": "பிலிப்பியர்",
  "Colossians": "கொலோசெயர்",
  "1 Thessalonians": "1 தெசலோனிக்கேயர்",
  "2 Thessalonians": "2 தெசலோனிக்கேயர்",
  "1 Timothy": "1 தீமோத்தேயு",
  "2 Timothy": "2 தீமோத்தேயு",
  "Titus": "தீத்து",
  "Philemon": "பிலேமோன்",
  "Hebrews": "எபிரெயர்",
  "James": "யாக்கோபு",
  "1 Peter": "1 பேதுரு",
  "2 Peter": "2 பேதுரு",
  "1 John": "1 யோவான்",
  "2 John": "2 யோவான்",
  "3 John": "3 யோவான்",
  "Jude": "யூதா",
  "Revelation": "வெளிப்படுத்தின விசேஷம்"
};

function parseReference(reference) {
  const match = String(reference || "").trim().match(/^(.+)\s+(\d+):(\d+)$/);
  if (!match) return null;
  return {
    book: match[1],
    chapter: match[2],
    verse: match[3]
  };
}

function getTamilVerseByReference(reference, taBible) {
  if (!taBible || Array.isArray(taBible)) return "";
  const parts = parseReference(reference);
  if (!parts) return "";

  const taBook = EN_TO_TA_BOOK[parts.book];
  if (!taBook || !taBible[taBook]) return "";

  const chapterObj = taBible[taBook][parts.chapter];
  if (!chapterObj) return "";
  const text = chapterObj[parts.verse];
  return typeof text === "string" ? text.trim() : "";
}

function enrichVersesWithTamil(verses, taBible) {
  return verses.map((verse) => {
    const tamil = verse.tamilText || verse.text_ta || getTamilVerseByReference(verse.reference, taBible);
    return {
      ...verse,
      tamilText: String(tamil || "").trim()
    };
  });
}

function renderWeeklyAndDailyVerses(verses) {
  if (!verses.length) return;

  const today = new Date();
  const dayIndex = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000) % verses.length;
  const weekIndex = Math.floor(Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000) / 7) % verses.length;

  const daily = verses[dayIndex];
  const weekly = verses[weekIndex];
  const tamilFallback = "Tamil verse will appear when Tamil Bible data is available.";

  const weeklySlot = bySel("[data-weekly-verse]");
  if (weeklySlot) {
    weeklySlot.innerHTML = `
      <div class="verse-bilingual-grid">
        <article class="verse-lang-card">
          <h3>English</h3>
          <blockquote>${weekly.text}</blockquote>
        </article>
        <article class="verse-lang-card">
          <h3>Tamil</h3>
          <blockquote>${weekly.tamilText || tamilFallback}</blockquote>
        </article>
      </div>
      <p class="muted">${weekly.reference}</p>
    `;
  }

  const dailySlot = bySel("[data-daily-grace]");
  if (dailySlot) {
    dailySlot.innerHTML = `
      <h3>Daily Scripture</h3>
      <div class="verse-bilingual-grid">
        <article class="verse-lang-card">
          <h3>English</h3>
          <p>${daily.text}</p>
        </article>
        <article class="verse-lang-card">
          <h3>Tamil</h3>
          <p>${daily.tamilText || tamilFallback}</p>
        </article>
      </div>
      <p class="muted">${daily.reference}</p>
      <h3>Devotional Thought</h3>
      <p>Grace empowers us to trust God today and walk by faith in every season.</p>
      <h3>Daily Quote</h3>
      <p class="muted">"Christ is our righteousness, peace, and hope."</p>
    `;
  }
}

function initMemoryTracker() {
  const form = bySel("[data-memory-form]");
  const list = bySel("[data-memory-list]");
  if (!form || !list) return;

  function getItems() {
    try {
      return JSON.parse(localStorage.getItem("zgm-memory-verses") || "[]");
    } catch (_err) {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem("zgm-memory-verses", JSON.stringify(items));
  }

  function draw() {
    const items = getItems();
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<li class="muted">No memory verses added yet.</li>';
      return;
    }

    items.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "card";
      li.style.marginBottom = "0.6rem";
      li.innerHTML = `<strong>${item.reference}</strong><p>${item.text}</p><p class="muted">Milestone ${idx + 1}</p>`;
      list.appendChild(li);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const reference = String(fd.get("reference") || "").trim();
    const text = String(fd.get("text") || "").trim();
    if (!reference || !text) {
      setFormMessage(form, "Please add both reference and verse text.");
      return;
    }

    const items = getItems();
    items.push({ reference, text });
    saveItems(items);
    setFormMessage(form, "Verse added. Keep meditating on the Word.");
    form.reset();
    draw();
  });

  draw();
}

async function bootData() {
  const [events, sermons, studies, devotions, missions, prayerWall, verses, tamilBible] = await Promise.all([
    getJson("assets/data/events.json"),
    getJson("assets/data/sermons.json"),
    getJson("assets/data/studies.json"),
    getJson("assets/data/devotions.json"),
    getJson("assets/data/missions.json"),
    getJson("assets/data/prayer-wall.json"),
    getJson("assets/data/verses.json"),
    getJson("bible-data/bible-ta-ov.json")
  ]);

  const bilingualVerses = enrichVersesWithTamil(verses, tamilBible);

  renderHomeEvents(events);
  renderEventsPage(events);
  renderHomeSermons(sermons);
  initSermons(sermons);
  initStudies(studies);
  renderDevotions(devotions);
  renderMissions(missions);
  renderPrayerWall(prayerWall);
  renderWeeklyAndDailyVerses(bilingualVerses);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // no-op in static local preview
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setYear();
  initTheme();
  initMenu();
  initReveal();
  initSimpleForms();
  initEmailApiForms();
  initMemoryTracker();
  bootData();
  registerServiceWorker();
});
