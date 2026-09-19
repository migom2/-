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
