(() => {
  const STORAGE_KEY = "gratitude-jar:entries:v1";
  const FILL_CAP = 150; // 이 개수쯤 쌓이면 유리병이 거의 가득 차 보여요

  const PASTELS = [
    "#FFD6E0",
    "#FFEAA7",
    "#C7F0D8",
    "#B5EAD7",
    "#C7CEEA",
    "#E2C2FF",
    "#FFDAC1",
    "#B8E0F6",
    "#FFF1B8",
    "#D4F0F0",
    "#F6C6EA",
    "#CDECC5",
  ];

  const STAR_POINTS = [
    [50, 0],
    [61, 35],
    [98, 35],
    [68, 57],
    [79, 91],
    [50, 70],
    [21, 91],
    [32, 57],
    [2, 35],
    [39, 35],
  ];

  const el = {
    jarCount: document.getElementById("jar-count"),
    jarStars: document.getElementById("jar-stars"),
    writeBtn: document.getElementById("write-btn"),
    drawBtn: document.getElementById("draw-btn"),

    writeModal: document.getElementById("write-modal"),
    writeCard: document.getElementById("write-card"),
    writeClose: document.getElementById("write-close"),
    stripInputWrap: document.querySelector(".strip-input-wrap"),
    entryInput: document.getElementById("entry-input"),
    entryDate: document.getElementById("entry-date"),
    pendingList: document.getElementById("pending-list"),
    addMoreBtn: document.getElementById("add-more-btn"),
    doneBtn: document.getElementById("done-btn"),
    reviewCount: document.getElementById("review-count"),
    reviewList: document.getElementById("review-list"),
    backToWriteBtn: document.getElementById("back-to-write-btn"),
    saveJarBtn: document.getElementById("save-jar-btn"),

    drawModal: document.getElementById("draw-modal"),
    drawClose: document.getElementById("draw-close"),
    revealStar: document.getElementById("reveal-star"),
    revealDate: document.getElementById("reveal-date"),
    revealText: document.getElementById("reveal-text"),
    drawAgainBtn: document.getElementById("draw-again-btn"),
    revealDeleteBtn: document.getElementById("reveal-delete-btn"),

    toast: document.getElementById("toast"),
  };

  let entries = loadEntries();
  let pending = []; // { text, color } — 아직 유리병에 저장되지 않은 초안
  let colorCursor = Math.floor(Math.random() * PASTELS.length);
  let currentRevealId = null;

  renderJar();
  updateCountLabel();
  updateDrawButton();

  // ---------- storage ----------

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function nextPastel() {
    const color = PASTELS[colorCursor % PASTELS.length];
    colorCursor++;
    return color;
  }

  function formatShortDate(date) {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- shape helpers ----------

  function rectPerimeterPoints(n) {
    const points = [];
    const total = 400; // 100 units per side * 4 sides
    for (let i = 0; i < n; i++) {
      const d = (i / n) * total;
      if (d < 100) points.push([d, 0]);
      else if (d < 200) points.push([100, d - 100]);
      else if (d < 300) points.push([100 - (d - 200), 100]);
      else points.push([0, 100 - (d - 300)]);
    }
    return points;
  }

  function toClipPath(points) {
    return `polygon(${points.map((p) => `${p[0]}% ${p[1]}%`).join(",")})`;
  }

  const RECT_CLIP = toClipPath(rectPerimeterPoints(STAR_POINTS.length));
  const STAR_CLIP = toClipPath(STAR_POINTS);

  // ---------- jar rendering ----------

  function renderJar(settleNewest) {
    el.jarStars.innerHTML = "";
    const count = entries.length;
    if (count === 0) return;

    const containerHeight = el.jarStars.clientHeight || 244;
    const fillRatio = Math.min(count / FILL_CAP, 1);
    const maxFillPx = Math.max(containerHeight * fillRatio, 26);
    const toRender = count > FILL_CAP ? shuffle(entries).slice(0, FILL_CAP) : entries;

    toRender.forEach((entry) => {
      const star = document.createElement("div");
      star.className = "paper-star";
      star.style.background = entry.color || nextPastel();
      const size = 14 + Math.random() * 10;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;

      const bottom = Math.max(4, Math.random() * maxFillPx - size / 2);
      const left = 4 + Math.random() * 84;
      const rot = Math.random() * 360;
      star.style.bottom = `${bottom}px`;
      star.style.left = `${left}%`;
      star.style.setProperty("--rot", `${rot}deg`);
      star.style.transform = `rotate(${rot}deg)`;

      el.jarStars.appendChild(star);
    });
  }

  function updateCountLabel() {
    const count = entries.length;
    el.jarCount.textContent = count === 0 ? "아직 채워진 별이 없어요" : `총 ${count}개의 감사 별이 담겨 있어요`;
  }

  function updateDrawButton() {
    el.drawBtn.disabled = entries.length === 0;
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  // ---------- fold-to-star animation ----------

  function morphRectToStar(srcRect, color, targetRect) {
    return new Promise((resolve) => {
      const clone = document.createElement("div");
      clone.className = "fold-fx";
      clone.style.left = `${srcRect.left}px`;
      clone.style.top = `${srcRect.top}px`;
      clone.style.width = `${srcRect.width}px`;
      clone.style.height = `${srcRect.height}px`;
      clone.style.background = color;
      clone.style.borderRadius = "7px";
      clone.style.clipPath = RECT_CLIP;
      clone.style.transform = "rotate(0deg)";
      document.body.appendChild(clone);

      void clone.offsetWidth; // force reflow so the transition below animates

      requestAnimationFrame(() => {
        clone.style.transition =
          "left 0.65s cubic-bezier(.34,1.1,.4,1), top 0.65s cubic-bezier(.34,1.1,.4,1), " +
          "width 0.65s cubic-bezier(.34,1.1,.4,1), height 0.65s cubic-bezier(.34,1.1,.4,1), " +
          "clip-path 0.65s ease-in-out, transform 0.65s ease-in-out, border-radius 0.65s ease";
        clone.style.left = `${targetRect.left}px`;
        clone.style.top = `${targetRect.top}px`;
        clone.style.width = `${targetRect.width}px`;
        clone.style.height = `${targetRect.height}px`;
        clone.style.borderRadius = "2px";
        clone.style.clipPath = STAR_CLIP;
        clone.style.transform = `rotate(${targetRect.rot}deg)`;
      });

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clone.remove();
        resolve();
      };
      clone.addEventListener("transitionend", (e) => {
        if (e.propertyName === "clip-path") finish();
      });
      setTimeout(finish, 800); // safety net in case transitionend doesn't fire
    });
  }

  // ---------- write modal ----------

  function resetInputHeight() {
    el.entryInput.style.height = "auto";
  }

  function openWriteModal() {
    pending = [];
    el.entryInput.value = "";
    resetInputHeight();
    el.entryDate.textContent = formatShortDate(new Date());
    setStage("write");
    renderPendingList();
    el.writeModal.hidden = false;
    el.entryInput.focus();
  }

  function closeWriteModal() {
    const hasUnsaved = pending.length > 0 || el.entryInput.value.trim().length > 0;
    if (hasUnsaved && !confirm("작성 중인 별이 사라져요. 닫을까요?")) return;
    el.writeModal.hidden = true;
    pending = [];
    el.entryInput.value = "";
    resetInputHeight();
  }

  function setStage(stage) {
    el.writeCard.dataset.stage = stage;
  }

  function addCurrentInputToPending() {
    const text = el.entryInput.value.trim();
    if (!text) {
      el.stripInputWrap.classList.add("shake");
      setTimeout(() => el.stripInputWrap.classList.remove("shake"), 300);
      return false;
    }
    pending.push({ text, color: nextPastel(), date: formatShortDate(new Date()) });
    el.entryInput.value = "";
    resetInputHeight();
    renderPendingList();
    return true;
  }

  function buildStripItem(item, onRemove) {
    const li = document.createElement("li");
    li.className = "strip-item";
    li.style.background = item.color;

    const row = document.createElement("div");
    row.className = "strip-item-row";

    const glyph = document.createElement("span");
    glyph.className = "strip-glyph";
    glyph.textContent = "✱";

    const span = document.createElement("span");
    span.className = "entry-text";
    span.textContent = item.text;

    row.append(glyph, span);

    if (onRemove) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", onRemove);
      row.appendChild(removeBtn);
    }

    li.appendChild(row);

    const date = document.createElement("span");
    date.className = "strip-date";
    date.textContent = item.date || formatShortDate(new Date());
    li.appendChild(date);

    return li;
  }

  function renderPendingList() {
    el.pendingList.innerHTML = "";
    pending.forEach((item, index) => {
      const li = buildStripItem(item, () => {
        pending.splice(index, 1);
        renderPendingList();
      });
      el.pendingList.appendChild(li);
    });
  }

  function renderReviewList() {
    el.reviewCount.textContent = String(pending.length);
    el.reviewList.innerHTML = "";
    pending.forEach((item) => {
      el.reviewList.appendChild(buildStripItem(item));
    });
  }

  function handleDone() {
    if (el.entryInput.value.trim()) addCurrentInputToPending();
    if (pending.length === 0) {
      el.entryInput.focus();
      return;
    }
    renderReviewList();
    setStage("review");
  }

  async function saveToJar() {
    if (pending.length === 0) return;
    el.saveJarBtn.disabled = true;

    const stripEls = Array.from(el.reviewList.querySelectorAll(".strip-item"));
    const srcRects = stripEls.map((elm) => elm.getBoundingClientRect());
    const savedPending = pending;

    el.writeModal.hidden = true;
    pending = [];

    const jarRect = el.jarStars.getBoundingClientRect();
    const animations = srcRects.map((srcRect, i) => {
      const size = 14 + Math.random() * 10;
      const left = jarRect.left + 6 + Math.random() * Math.max(jarRect.width - size - 12, 10);
      const fillPx = Math.max(jarRect.height * Math.min(entries.length / FILL_CAP + 0.15, 1), 40);
      const top = jarRect.top + jarRect.height - size - Math.random() * Math.min(fillPx, jarRect.height - size - 4);
      const rot = Math.random() * 360;
      return new Promise((resolve) => {
        setTimeout(() => {
          morphRectToStar(srcRect, savedPending[i].color, { left, top, width: size, height: size, rot }).then(
            resolve
          );
        }, i * 90);
      });
    });

    await Promise.all(animations);

    const now = Date.now();
    savedPending.forEach((item, i) => {
      entries.unshift({
        id: `${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        text: item.text,
        color: item.color,
        createdAt: now,
      });
    });
    saveEntries();

    renderJar();
    updateCountLabel();
    updateDrawButton();
    el.saveJarBtn.disabled = false;

    const newStars = Array.from(el.jarStars.querySelectorAll(".paper-star")).slice(0, savedPending.length);
    newStars.forEach((star) => star.classList.add("settling"));

    showToast(`🌟 ${savedPending.length}개의 별을 유리병에 담았어요`);
  }

  el.writeBtn.addEventListener("click", openWriteModal);
  el.writeClose.addEventListener("click", closeWriteModal);
  el.addMoreBtn.addEventListener("click", addCurrentInputToPending);
  el.doneBtn.addEventListener("click", handleDone);
  el.backToWriteBtn.addEventListener("click", () => setStage("write"));
  el.saveJarBtn.addEventListener("click", saveToJar);

  el.entryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addCurrentInputToPending();
    }
  });

  el.entryInput.addEventListener("input", () => {
    el.entryInput.style.height = "auto";
    el.entryInput.style.height = `${el.entryInput.scrollHeight}px`;
  });

  el.writeModal.addEventListener("click", (e) => {
    if (e.target === el.writeModal) closeWriteModal();
  });

  // ---------- draw modal ----------

  function pickRandomEntry(excludeId) {
    if (entries.length === 0) return null;
    if (entries.length === 1) return entries[0];
    let entry;
    do {
      entry = entries[Math.floor(Math.random() * entries.length)];
    } while (entry.id === excludeId);
    return entry;
  }

  function openDrawModal() {
    const entry = pickRandomEntry();
    if (!entry) return;
    showReveal(entry);
    el.drawModal.hidden = false;
  }

  function showReveal(entry) {
    currentRevealId = entry.id;
    el.revealStar.style.background = entry.color;
    el.revealStar.style.animation = "none";
    void el.revealStar.offsetWidth;
    el.revealStar.style.animation = "";
    el.revealDate.textContent = new Date(entry.createdAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    el.revealText.textContent = entry.text;
  }

  function closeDrawModal() {
    el.drawModal.hidden = true;
    currentRevealId = null;
  }

  function drawAgain() {
    const entry = pickRandomEntry(currentRevealId);
    if (!entry) {
      closeDrawModal();
      return;
    }
    showReveal(entry);
  }

  function deleteRevealedStar() {
    if (!currentRevealId) return;
    if (!confirm("이 별을 유리병에서 지울까요?")) return;
    entries = entries.filter((e) => e.id !== currentRevealId);
    saveEntries();
    renderJar();
    updateCountLabel();
    updateDrawButton();

    const next = pickRandomEntry();
    if (next) {
      showReveal(next);
    } else {
      closeDrawModal();
      showToast("유리병이 비었어요");
    }
  }

  el.drawBtn.addEventListener("click", openDrawModal);
  el.drawClose.addEventListener("click", closeDrawModal);
  el.drawAgainBtn.addEventListener("click", drawAgain);
  el.revealDeleteBtn.addEventListener("click", deleteRevealedStar);
  el.drawModal.addEventListener("click", (e) => {
    if (e.target === el.drawModal) closeDrawModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!el.drawModal.hidden) closeDrawModal();
    else if (!el.writeModal.hidden) closeWriteModal();
  });
})();
