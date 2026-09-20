(() => {
  const todayKey = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `voice-todo:${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const STORAGE_KEY = todayKey();

  const el = {
    micBtn: document.getElementById("mic-btn"),
    micHint: document.getElementById("mic-hint"),
    interim: document.getElementById("interim"),
    todayTag: document.getElementById("today-tag"),
    manualForm: document.getElementById("manual-form"),
    manualInput: document.getElementById("manual-input"),
    list: document.getElementById("todo-list"),
    emptyMsg: document.getElementById("empty-msg"),
    progress: document.getElementById("progress"),
    clearDoneBtn: document.getElementById("clear-done-btn"),
  };

  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];
  const now = new Date();
  el.todayTag.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(
    now.getDate()
  ).padStart(2, "0")} (${weekday})`;

  let todos = loadTodos();
  render();

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  const SPLIT_PATTERN = /(?:,|、|그리고 나서|그리고나서|그리고|또한|또|그 다음에|그다음에|그 다음|그다음|다음으로|;|\n)/g;

  function splitSpokenTasks(text) {
    return text
      .split(SPLIT_PATTERN)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.push({ id: Date.now() + Math.random(), text: trimmed, done: false });
    saveTodos();
    render();
  }

  function toggleTodo(id) {
    const t = todos.find((t) => t.id === id);
    if (t) t.done = !t.done;
    saveTodos();
    render();
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    render();
  }

  function clearDone() {
    todos = todos.filter((t) => !t.done);
    saveTodos();
    render();
  }

  function render() {
    el.list.innerHTML = "";
    todos.forEach((t) => {
      const li = document.createElement("li");
      li.className = "todo-item" + (t.done ? " done" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "todo-check";
      checkbox.checked = t.done;
      checkbox.addEventListener("change", () => toggleTodo(t.id));

      const span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = t.text;

      const delBtn = document.createElement("button");
      delBtn.className = "todo-delete";
      delBtn.type = "button";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => deleteTodo(t.id));

      li.append(checkbox, span, delBtn);
      el.list.appendChild(li);
    });

    const doneCount = todos.filter((t) => t.done).length;
    el.progress.textContent = `${doneCount}/${todos.length}`;
    el.emptyMsg.style.display = todos.length === 0 ? "block" : "none";
  }

  el.manualForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(el.manualInput.value);
    el.manualInput.value = "";
  });

  el.clearDoneBtn.addEventListener("click", clearDone);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    el.micBtn.disabled = true;
    el.micHint.textContent = "이 브라우저는 음성 인식을 지원하지 않아요. 아래에 직접 입력해주세요.";
  } else {
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let listening = false;
    let userStopped = false;
    let pendingInterim = "";

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          splitSpokenTasks(transcript).forEach(addTodo);
          pendingInterim = "";
          el.interim.textContent = "";
        } else {
          interimText += transcript;
        }
      }
      if (interimText) {
        pendingInterim = interimText;
        el.interim.textContent = interimText;
      }
    };

    function commitPendingInterim() {
      if (pendingInterim.trim()) {
        splitSpokenTasks(pendingInterim).forEach(addTodo);
        pendingInterim = "";
      }
    }

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        el.micHint.textContent = "마이크 권한을 허용해주세요.";
        userStopped = true;
        listening = false;
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        el.micHint.textContent = `음성 인식 오류가 발생했어요 (${event.error}). 다시 시도해주세요.`;
      }
    };

    recognition.onend = () => {
      commitPendingInterim();
      if (listening && !userStopped) {
        try {
          recognition.start();
        } catch {
          setMicState(false);
        }
      } else {
        setMicState(false);
      }
    };

    function setMicState(isListening) {
      listening = isListening;
      el.micBtn.setAttribute("aria-pressed", String(isListening));
      el.micHint.textContent = isListening ? "듣고 있어요... 다시 누르면 멈춰요" : "버튼을 누르고 할 일을 말해보세요";
      if (!isListening) el.interim.textContent = "";
    }

    el.micBtn.addEventListener("click", () => {
      if (listening) {
        userStopped = true;
        recognition.stop();
        setMicState(false);
      } else {
        userStopped = false;
        try {
          recognition.start();
          setMicState(true);
        } catch {
          // already started
        }
      }
    });
  }
})();
