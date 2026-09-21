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

  const el = {
    jarCount: document.getElementById("jar-count"),
    jarStars: document.getElementById("jar-stars"),
    writeBtn: document.getElementById("write-btn"),
    drawBtn: document.getElementById("draw-btn"),

    writeModal: document.getElementById("write-modal"),
    writeCard: document.getElementById("write-card"),
    writeClose: document.getElementById("write-close"),
    entryInput: document.getElementById("entry-input"),
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

  function randomPastel() {
    return PASTELS[Math.floor(Math.random() * PASTELS.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- jar rendering ----------

  function renderJar() {
    el.jarStars.innerHTML = "";
    const count = entries.length;
    if (count === 0) return;

    const containerHeight = el.jarStars.clientHeight || 240;
    const fillRatio = Math.min(count / FILL_CAP, 1);
    const maxFillPx = Math.max(containerHeight * fillRatio, 26); // 별이 적어도 바닥에 살짝 쌓여 보이도록
    const toRender = count > FILL_CAP ? shuffle(entries).slice(0, FILL_CAP) : entries;

    toRender.forEach((entry) => {
      const star = document.createElement("div");
      star.className = "paper-star";
      star.style.background = entry.color || randomPastel();
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

  // ---------- write modal ----------

  function openWriteModal() {
    pending = [];
    el.entryInput.value = "";
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
  }

  function setStage(stage) {
    el.writeCard.dataset.stage = stage;
  }

  function addCurrentInputToPending() {
    const text = el.entryInput.value.trim();
    if (!text) return false;
    pending.push({ text, color: randomPastel() });
    el.entryInput.value = "";
    renderPendingList();
    return true;
  }

  function renderPendingList() {
    el.pendingList.innerHTML = "";
    pending.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "pending-item";

      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = item.color;

      const span = document.createElement("span");
      span.className = "entry-text";
      span.textContent = item.text;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        pending.splice(index, 1);
        renderPendingList();
      });

      li.append(dot, span, removeBtn);
      el.pendingList.appendChild(li);
    });
  }

  function renderReviewList() {
    el.reviewCount.textContent = String(pending.length);
    el.reviewList.innerHTML = "";
    pending.forEach((item) => {
      const li = document.createElement("li");
      li.className = "review-item";

      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = item.color;

      const span = document.createElement("span");
      span.className = "entry-text";
      span.textContent = item.text;

      li.append(dot, span);
      el.reviewList.appendChild(li);
    });
  }

  function handleDone() {
    addCurrentInputToPending();
    if (pending.length === 0) {
      el.entryInput.focus();
      el.entryInput.classList.add("shake");
      setTimeout(() => el.entryInput.classList.remove("shake"), 300);
      return;
    }
    renderReviewList();
    setStage("review");
  }

  function saveToJar() {
    if (pending.length === 0) return;
    const now = Date.now();
    pending.forEach((item, i) => {
      entries.unshift({
        id: `${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        text: item.text,
        color: item.color,
        createdAt: now,
      });
    });
    saveEntries();

    const savedCount = pending.length;
    pending = [];
    el.writeModal.hidden = true;

    renderJar();
    updateCountLabel();
    updateDrawButton();

    const newStars = Array.from(el.jarStars.querySelectorAll(".paper-star")).slice(0, savedCount);
    newStars.forEach((star) => star.classList.add("dropping"));

    showToast(`🌟 ${savedCount}개의 별을 유리병에 담았어요`);
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
