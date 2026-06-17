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
  bySelAll("form[data-generic-form], form[data-newsletter-form]").forEach((form) => {
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

function formActionPath(form) {
  const action = String(form.getAttribute("action") || "").trim();
  return action.replace(/^https?:\/\/[^/]+/i, "");
}

function buildApiPayload(form, fd) {
  const actionPath = formActionPath(form);

  if (actionPath === "/api/small-group") {
    return {
      name: String(fd.get("name") || "").trim(),
      area: String(fd.get("area") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      message: String(fd.get("message") || "").trim()
    };
  }

  if (actionPath === "/api/volunteer") {
    return {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      ministry: String(fd.get("ministry") || "").trim(),
      message: String(fd.get("message") || "").trim()
    };
  }

  return {
    name: String(fd.get("name") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    subject: String(fd.get("subject") || "").trim(),
    message: String(fd.get("message") || "").trim()
  };
}

function successMessageForForm(form) {
  const actionPath = formActionPath(form);
  if (actionPath === "/api/small-group") {
    return "Thank you. Your small group registration has been received.";
  }
  if (actionPath === "/api/volunteer") {
    return "Thank you. Your volunteer signup has been received.";
  }
  return "Thank you. Your message has been sent.";
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
      const payload = buildApiPayload(form, fd);

      try {
        const res = await fetch(resolveApiEndpoint(form), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          let apiError = "Failed to submit form.";
          try {
            const data = await res.json();
            if (data && typeof data.error === "string" && data.error) {
              apiError = data.error;
            }
          } catch (_jsonErr) {
            // Keep fallback API error message when response body is not JSON.
          }
          throw new Error(apiError);
        }

        setFormMessage(form, successMessageForForm(form));
        form.reset();
      } catch (err) {
        const msg = err && err.message ? err.message : "Unable to send right now. Please try again shortly.";
        setFormMessage(form, msg);
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

function renderWeeklyAndDailyVerses(verses) {
  if (!Array.isArray(verses) || !verses.length) return;

  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const dayIndex = dayOfYear % verses.length;
  const weekIndex = Math.floor(dayOfYear / 7) % verses.length;

  const daily = verses[dayIndex] || {};
  const weekly = verses[weekIndex] || {};
  const tamilFallback = "Tamil verse will appear when Tamil text is available in verse data.";

  const weeklySlot = bySel("[data-weekly-verse]");
  if (weeklySlot) {
    weeklySlot.innerHTML = `
      <div class="verse-bilingual-grid">
        <article class="verse-lang-card">
          <h3>English</h3>
          <blockquote>${weekly.text || ""}</blockquote>
        </article>
        <article class="verse-lang-card">
          <h3>Tamil</h3>
          <blockquote>${weekly.tamilText || tamilFallback}</blockquote>
        </article>
      </div>
      <p class="muted">${weekly.reference || ""}</p>
    `;
  }

  const dailySlot = bySel("[data-daily-grace]");
  if (dailySlot) {
    dailySlot.innerHTML = `
      <h3>Daily Scripture</h3>
      <div class="verse-bilingual-grid">
        <article class="verse-lang-card">
          <h3>English</h3>
          <p>${daily.text || ""}</p>
        </article>
        <article class="verse-lang-card">
          <h3>Tamil</h3>
          <p>${daily.tamilText || tamilFallback}</p>
        </article>
      </div>
      <p class="muted">${daily.reference || ""}</p>
      <h3>Devotional Thought</h3>
      <p>Grace empowers us to trust God today and walk by faith in every season.</p>
      <h3>Daily Quote</h3>
      <p class="muted">"Christ is our righteousness, peace, and hope."</p>
    `;
  }
}

async function bootData() {
  const [events, sermons, verses] = await Promise.all([
    getJson("assets/data/events.json"),
    getJson("assets/data/sermons.json"),
    getJson("assets/data/verses.json")
  ]);

  renderHomeEvents(events);
  renderHomeSermons(sermons);
  renderWeeklyAndDailyVerses(verses);
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
  bootData();
  registerServiceWorker();
});
