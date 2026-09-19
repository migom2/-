(() => {
  "use strict";

  const SLOTS = 8;
  const STORAGE_HABITS = "pizza-habit-habits-v1";
  const STORAGE_STATE = "pizza-habit-state-v1";
  const STORAGE_HISTORY = "pizza-habit-history-v1";

  const $ = (sel) => document.querySelector(sel);

  const pizzaEl = $("#pizza");
  const pizzaWrap = $("#pizza-wrap");
  const boxWrap = $("#box-wrap");
  const boxLid = $("#box-lid");
  const stampEl = $("#stamp");
  const stampDateEl = $("#stamp-date");
  const completeMsg = $("#complete-msg");
  const countDoneEl = $("#count-done");
  const countTotalEl = $("#count-total");
  const habitListEl = $("#habit-list");
  const addForm = $("#add-form");
  const addInput = $("#add-input");
  const addBtn = $("#add-btn");
  const fullHint = $("#full-hint");
  const statStreak = $("#stat-streak");
  const statTotal = $("#stat-total");
  const resetBtn = $("#reset-btn");
  const historyRow = $("#history-row");
  const historyEmpty = $("#history-empty");

  // ---------- utils ----------

  function todayStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function prevDateStr(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return todayStr(d);
  }

  function formatStampDate(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${y.slice(2)}.${m}.${d}`;
  }

  function formatShortDate(dateStr) {
    const [, m, d] = dateStr.split("-");
    return `${m}.${d}`;
  }

  function uid() {
    return "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }

  // ---------- state ----------

  let habits = loadJSON(STORAGE_HABITS, []); // [{id, name}]
  let state = loadJSON(STORAGE_STATE, null); // {date, completed: {id:true}, boxed: bool}
  let history = loadJSON(STORAGE_HISTORY, []); // [{date, names}]

  const today = todayStr();

  if (!state || state.date !== today) {
    state = { date: today, completed: {}, boxed: false };
    saveJSON(STORAGE_STATE, state);
  }

  function persistHabits() { saveJSON(STORAGE_HABITS, habits); }
  function persistState() { saveJSON(STORAGE_STATE, state); }
  function persistHistory() { saveJSON(STORAGE_HISTORY, history); }

  // ---------- pizza slice geometry ----------

  function buildSlices() {
    pizzaEl.innerHTML = "";
    for (let i = 0; i < SLOTS; i++) {
      const a0 = (i * 360) / SLOTS - 90;
      const a1 = ((i + 1) * 360) / SLOTS - 90;
      const r = 80; // beyond circle radius so the parent's circular clip forms the arc
      const p0 = polar(a0, r);
      const p1 = polar(a1, r);

      const slice = document.createElement("div");
      slice.className = "slice";
      slice.dataset.index = String(i);
      slice.style.clipPath = `polygon(50% 50%, ${p0.x}% ${p0.y}%, ${p1.x}% ${p1.y}%)`;

      const empty = document.createElement("div");
      empty.className = "slice-empty";

      const img = document.createElement("div");
      img.className = "slice-img";
      img.style.backgroundImage = PIZZA_ART_URL;

      slice.appendChild(empty);
      slice.appendChild(img);
      pizzaEl.appendChild(slice);
    }
  }

  function polar(angleDeg, radiusPct) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: 50 + radiusPct * Math.sin(rad),
      y: 50 - radiusPct * Math.cos(rad),
    };
  }

  // ---------- hand-drawn cartoon pizza artwork (SVG, generated once) ----------

  const PIZZA_CX = 130;
  const PIZZA_CY = 130;

  function px(angleDeg, radius) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: PIZZA_CX + radius * Math.sin(rad),
      y: PIZZA_CY - radius * Math.cos(rad),
    };
  }

  function svgPepperoni(cx, cy, r) {
    const dots = [
      [cx - r * 0.35, cy - r * 0.2, r * 0.16],
      [cx + r * 0.3, cy - r * 0.1, r * 0.14],
      [cx - r * 0.05, cy + r * 0.4, r * 0.15],
      [cx + r * 0.35, cy + r * 0.25, r * 0.12],
    ];
    const dotTags = dots
      .map(([dx, dy, dr]) => `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${dr.toFixed(1)}" fill="#a52c1f" opacity="0.85"/>`)
      .join("");
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#d8492f" stroke="#9c2c1c" stroke-width="1.6"/>
      ${dotTags}
      <ellipse cx="${(cx - r * 0.32).toFixed(1)}" cy="${(cy - r * 0.35).toFixed(1)}" rx="${(r * 0.28).toFixed(1)}" ry="${(r * 0.18).toFixed(1)}" fill="#fff" opacity="0.22"/>
    `;
  }

  function svgOlive(cx, cy, r) {
    return `
      <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.9}" fill="#2f2a2a" stroke="#1a1616" stroke-width="1.2"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${(r * 0.4).toFixed(1)}" ry="${(r * 0.34).toFixed(1)}" fill="#f6cf6b"/>
      <ellipse cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.3).toFixed(1)}" rx="${(r * 0.22).toFixed(1)}" ry="${(r * 0.14).toFixed(1)}" fill="#fff" opacity="0.3"/>
    `;
  }

  function svgBasil(cx, cy, rot) {
    return `
      <g transform="translate(${cx} ${cy}) rotate(${rot})">
        <ellipse cx="0" cy="0" rx="13" ry="7.5" fill="#5aa85f" stroke="#357a3c" stroke-width="1.4"/>
        <path d="M -11 0 Q 0 -2.5 11 0" fill="none" stroke="#357a3c" stroke-width="1" opacity="0.8"/>
        <ellipse cx="-3" cy="-2.5" rx="4" ry="2" fill="#fff" opacity="0.25"/>
      </g>
    `;
  }

  function svgTomato(cx, cy, r) {
    const seeds = [0, 1, 2, 3].map((k) => {
      const a = k * 90 + 20;
      const rad = (a * Math.PI) / 180;
      const sx = cx + Math.cos(rad) * r * 0.42;
      const sy = cy + Math.sin(rad) * r * 0.42;
      return `<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="1.6" ry="1" fill="#ffe3b0" transform="rotate(${a} ${sx.toFixed(1)} ${sy.toFixed(1)})"/>`;
    }).join("");
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#e2543a" stroke="#a83322" stroke-width="1.6"/>
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.72).toFixed(1)}" fill="#f0765a"/>
      ${seeds}
      <ellipse cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.35).toFixed(1)}" rx="${(r * 0.25).toFixed(1)}" ry="${(r * 0.16).toFixed(1)}" fill="#fff" opacity="0.3"/>
    `;
  }

  const TOPPING_PATTERNS = [
    [ // pattern A
      { kind: "pepperoni", off: -13, radius: 46, r: 13 },
      { kind: "pepperoni", off: 11, radius: 70, r: 11 },
      { kind: "olive", off: 1, radius: 88, r: 7.5 },
      { kind: "basil", off: -9, radius: 28, rot: -20 },
    ],
    [ // pattern B
      { kind: "tomato", off: 0, radius: 52, r: 13 },
      { kind: "pepperoni", off: -14, radius: 82, r: 10 },
      { kind: "olive", off: 13, radius: 36, r: 7 },
      { kind: "olive", off: 14, radius: 80, r: 6.5 },
      { kind: "basil", off: -3, radius: 66, rot: 24 },
    ],
  ];

  function buildPizzaArtwork() {
    const crustR = 124;
    const sauceR = 110;
    const cheeseR = 102;

    // dough-bump texture around the crust rim
    let bumps = "";
    for (let k = 0; k < 28; k++) {
      const a = k * (360 / 28);
      const p = px(a, 117);
      bumps += `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="6.5" ry="9" transform="rotate(${a} ${p.x.toFixed(1)} ${p.y.toFixed(1)})" fill="#d9a24d" opacity="0.55"/>`;
    }

    // melty cheese speckles
    let speckles = "";
    for (let k = 0; k < 16; k++) {
      const a = k * 22.5 + (k % 3) * 6;
      const radius = 30 + (k % 4) * 15;
      const p = px(a, radius);
      speckles += `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="7" ry="5" fill="#e9ba57" opacity="0.55" transform="rotate(${a} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`;
    }

    // toppings, alternating pattern per slice so it reads as a varied hand-drawn pizza
    let toppings = "";
    for (let i = 0; i < SLOTS; i++) {
      const ca = (i + 0.5) * 45 - 90;
      const pattern = TOPPING_PATTERNS[i % 2];
      pattern.forEach((t) => {
        const p = px(ca + t.off, t.radius);
        if (t.kind === "pepperoni") toppings += svgPepperoni(p.x, p.y, t.r);
        else if (t.kind === "olive") toppings += svgOlive(p.x, p.y, t.r);
        else if (t.kind === "basil") toppings += svgBasil(p.x, p.y, t.rot);
        else if (t.kind === "tomato") toppings += svgTomato(p.x, p.y, t.r);
      });
    }

    // slice cut-lines
    let cuts = "";
    for (let i = 0; i < SLOTS; i++) {
      const a = i * 45 - 90;
      const p = px(a, crustR - 4);
      cuts += `<line x1="${PIZZA_CX}" y1="${PIZZA_CY}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#fbead0" stroke-width="2.5" opacity="0.85"/>`;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260">
        <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${crustR}" fill="#e8b559" stroke="#8a5a20" stroke-width="4"/>
        ${bumps}
        <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${sauceR}" fill="#c9432f" stroke="#8a5a20" stroke-width="1.5"/>
        <circle cx="${PIZZA_CX}" cy="${PIZZA_CY}" r="${cheeseR}" fill="#f6cf6b" stroke="#d99a3a" stroke-width="2"/>
        ${speckles}
        ${toppings}
        ${cuts}
        <ellipse cx="92" cy="80" rx="70" ry="42" fill="#fff" opacity="0.14"/>
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const PIZZA_ART_URL = buildPizzaArtwork();

  buildSlices();

  // ---------- rendering ----------

  function isCompletedToday(id) {
    return !!state.completed[id];
  }

  function completedCount() {
    return habits.filter((h) => isCompletedToday(h.id)).length;
  }

  function renderPizza() {
    const sliceEls = pizzaEl.querySelectorAll(".slice");
    sliceEls.forEach((el, i) => {
      const habit = habits[i];
      el.classList.remove("filled", "placeholder");
      if (!habit) {
        el.classList.add("placeholder");
      } else if (isCompletedToday(habit.id)) {
        el.classList.add("filled");
      }
    });
    const done = completedCount();
    countDoneEl.textContent = String(done);
    countTotalEl.textContent = String(SLOTS);
  }

  function renderHabitList() {
    habitListEl.innerHTML = "";
    const locked = state.boxed;

    habits.forEach((habit, i) => {
      const li = document.createElement("li");
      li.className = "habit-item" + (isCompletedToday(habit.id) ? " done" : "");

      const check = document.createElement("button");
      check.type = "button";
      check.className = "habit-check";
      check.textContent = "✓";
      check.disabled = locked;
      check.addEventListener("click", () => toggleHabit(habit.id));

      const name = document.createElement("span");
      name.className = "habit-name";
      name.textContent = habit.name;
      name.addEventListener("click", () => { if (!locked) toggleHabit(habit.id); });

      const tag = document.createElement("span");
      tag.className = "habit-slice-tag";
      tag.textContent = `#${i + 1}`;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "habit-del";
      del.textContent = "✕";
      del.title = "습관 삭제";
      del.disabled = locked;
      del.addEventListener("click", () => removeHabit(habit.id));

      li.append(check, name, tag, del);
      habitListEl.appendChild(li);
    });

    const canAdd = habits.length < SLOTS && !locked;
    addInput.disabled = !canAdd;
    addBtn.disabled = !canAdd;
    fullHint.classList.toggle("show", habits.length >= SLOTS && !locked);
  }

  function renderStats() {
    statTotal.textContent = String(history.length);
    statStreak.textContent = String(computeStreak());
  }

  function computeStreak() {
    const dates = new Set(history.map((h) => h.date));
    let cursor = today;
    let count = 0;
    if (dates.has(cursor)) {
      count = 1;
      cursor = prevDateStr(cursor);
    } else {
      cursor = prevDateStr(cursor);
    }
    while (dates.has(cursor)) {
      count++;
      cursor = prevDateStr(cursor);
    }
    return count;
  }

  function renderHistory() {
    const entries = history.slice(-14).reverse();
    historyEmpty.style.display = entries.length ? "none" : "block";
    historyRow.querySelectorAll(".history-box").forEach((n) => n.remove());
    entries.forEach((entry) => {
      const box = document.createElement("div");
      box.className = "history-box";
      box.title = entry.names ? entry.names.join(", ") : entry.date;

      const stamp = document.createElement("div");
      stamp.className = "history-stamp";
      stamp.innerHTML = `${formatShortDate(entry.date)}`;

      box.appendChild(stamp);
      historyRow.appendChild(box);
    });
  }

  function renderAll() {
    renderPizza();
    renderHabitList();
    renderStats();
    renderHistory();
  }

  // ---------- interactions ----------

  function toggleHabit(id) {
    if (state.boxed) return;
    if (state.completed[id]) {
      delete state.completed[id];
    } else {
      state.completed[id] = true;
    }
    persistState();
    renderPizza();
    renderHabitList();

    if (habits.length === SLOTS && completedCount() === SLOTS) {
      runCompleteSequence();
    }
  }

  function removeHabit(id) {
    if (state.boxed) return;
    habits = habits.filter((h) => h.id !== id);
    delete state.completed[id];
    persistHabits();
    persistState();
    renderAll();
  }

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.boxed) return;
    const name = addInput.value.trim();
    if (!name || habits.length >= SLOTS) return;
    habits.push({ id: uid(), name });
    persistHabits();
    addInput.value = "";
    renderAll();
  });

  resetBtn.addEventListener("click", () => {
    if (!confirm("오늘의 습관 체크 기록을 초기화할까요?")) return;
    state = { date: today, completed: {}, boxed: false };
    persistState();
    pizzaWrap.classList.remove("boxing", "pulsing");
    pizzaWrap.style.transform = "";
    pizzaWrap.style.opacity = "";
    boxWrap.classList.remove("visible");
    boxLid.classList.remove("closed");
    stampEl.classList.remove("stamping");
    completeMsg.classList.remove("show");
    renderAll();
  });

  // ---------- completion sequence ----------

  let sequenceRunning = false;

  function runCompleteSequence(skipAnimation = false) {
    if (sequenceRunning) return;
    sequenceRunning = true;

    stampDateEl.textContent = formatStampDate(state.date);

    if (skipAnimation) {
      pizzaWrap.classList.add("boxing");
      pizzaWrap.style.opacity = "0";
      pizzaWrap.style.pointerEvents = "none";
      boxWrap.classList.add("visible");
      boxLid.classList.add("closed");
      stampEl.classList.add("stamping");
      completeMsg.classList.add("show");
      sequenceRunning = false;
      return;
    }

    pizzaWrap.classList.add("pulsing");

    setTimeout(() => {
      pizzaWrap.classList.remove("pulsing");
      pizzaWrap.classList.add("boxing");
      boxWrap.classList.add("visible");

      setTimeout(() => {
        boxLid.classList.add("closed");

        setTimeout(() => {
          stampEl.classList.add("stamping");

          setTimeout(() => {
            completeMsg.classList.add("show");
            finalizeCompletion();
            sequenceRunning = false;
          }, 550);
        }, 700);
      }, 650);
    }, 1800);
  }

  function finalizeCompletion() {
    state.boxed = true;
    persistState();

    const already = history.some((h) => h.date === state.date);
    if (!already) {
      history.push({ date: state.date, names: habits.map((h) => h.name) });
      persistHistory();
    }
    renderHabitList();
    renderStats();
    renderHistory();
  }

  // ---------- init ----------

  renderAll();

  if (state.boxed) {
    runCompleteSequence(true);
  }
})();
