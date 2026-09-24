(function () {
  var STORAGE_KEY = 'vocab-progress-v1';
  var CUSTOM_WORDS_KEY = 'vocab-custom-words-v1';
  var CUSTOM_CATEGORIES_KEY = 'vocab-custom-categories-v1';
  var TOTAL_DAYS = 30;

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch (e) {
      // localStorage 사용 불가 시(사생활 보호 모드 등) 조용히 무시
    }
  }
  // Ask the browser not to evict saved progress when storage runs low.
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {}

  function getEntry(id) {
    return state.progress[id] || { status: 'new', correct: 0, wrong: 0 };
  }
  function setStatus(id, status) {
    var entry = state.progress[id] || { correct: 0, wrong: 0 };
    state.progress[id] = { correct: entry.correct || 0, wrong: entry.wrong || 0, status: status };
    saveProgress();
  }
  function recordResult(id, isCorrect) {
    var entry = state.progress[id] || { status: 'new', correct: 0, wrong: 0 };
    var correct = (entry.correct || 0) + (isCorrect ? 1 : 0);
    // Once a word is 암기완료 (from a flashcard or enough correct answers) it
    // stays that way until the learner misses it again.
    var known = isCorrect && (entry.status === 'known' || correct >= MASTERED_THRESHOLD);
    state.progress[id] = {
      correct: correct,
      wrong: (entry.wrong || 0) + (isCorrect ? 0 : 1),
      status: known ? 'known' : 'learning',
    };
    saveProgress();
  }
  function resetProgress() {
    state.progress = {};
    saveProgress();
  }

  function loadCustomWords() {
    try {
      var raw = localStorage.getItem(CUSTOM_WORDS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function saveCustomWords() {
    try {
      localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(state.customWords));
    } catch (e) {}
  }
  function loadCustomCategories() {
    try {
      var raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function saveCustomCategories() {
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(state.customCategories));
    } catch (e) {}
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function normalizeAnswer(s) {
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function genId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  var state = {
    day: 'all',
    tab: 'cards',
    progress: loadProgress(),
    customWords: loadCustomWords(),
    customCategories: loadCustomCategories(),
    cardFilter: 'all',
    cardDeck: [],
    cardIndex: 0,
    cardFlipped: false,
    quiz: { stage: 'setup', mode: 'en2ko', questions: [], index: 0, selected: null, score: 0, wrong: [] },
    write: { stage: 'setup', items: [], index: 0, input: '', submitted: false, score: 0, wrong: [] },
    wordQuery: '',
    wordStatus: 'all',
    confirmingReset: false,
    manage: {
      targetCategoryId: null,
      newEn: '',
      newKo: '',
      newExample: '',
      bulkText: '',
      addingCategory: false,
      newCategoryName: '',
      renamingCategoryId: null,
      renameValue: '',
      confirmingDeleteCategoryId: null,
      collapsed: {},
    },
  };

  function findCategory(id) {
    for (var i = 0; i < state.customCategories.length; i++) {
      if (state.customCategories[i].id === id) return state.customCategories[i];
    }
    return null;
  }

  function addCustomWord(en, ko, example, categoryId) {
    en = (en || '').trim();
    ko = (ko || '').trim();
    example = (example || '').trim();
    if (!en || !ko || !findCategory(categoryId)) return false;
    state.customWords.push({ id: genId(), en: en, ko: ko, example: example, categoryId: categoryId, createdAt: Date.now() });
    saveCustomWords();
    return true;
  }

  function addCustomWordsBulk(text, categoryId) {
    if (!findCategory(categoryId)) return 0;
    var lines = (text || '').split('\n');
    var added = 0;
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split(/\s*-\s*|\t/);
      if (parts.length >= 2) {
        var en = parts[0].trim();
        var ko = parts[1].trim();
        var example = parts.length > 2 ? parts.slice(2).join(' - ').trim() : '';
        if (en && ko) {
          state.customWords.push({ id: genId(), en: en, ko: ko, example: example, categoryId: categoryId, createdAt: Date.now() });
          added++;
        }
      }
    });
    if (added > 0) saveCustomWords();
    return added;
  }

  function moveWordToCategory(wordId, categoryId) {
    var w = state.customWords.filter(function (x) {
      return x.id === wordId;
    })[0];
    if (!w) return;
    w.categoryId = categoryId;
    saveCustomWords();
  }

  function renameCategory(categoryId, newName) {
    var cat = findCategory(categoryId);
    if (!cat) return;
    var trimmed = (newName || '').trim();
    if (!trimmed) return;
    cat.name = trimmed;
    saveCustomCategories();
  }

  function createCategory(name) {
    var trimmed = (name || '').trim();
    if (!trimmed) return null;
    var cat = { id: genId(), name: trimmed, createdAt: Date.now() };
    state.customCategories.push(cat);
    saveCustomCategories();
    return cat.id;
  }

  function deleteCategory(categoryId) {
    var idsToRemove = state.customWords
      .filter(function (w) {
        return w.categoryId === categoryId;
      })
      .map(function (w) {
        return w.id;
      });
    state.customWords = state.customWords.filter(function (w) {
      return w.categoryId !== categoryId;
    });
    state.customCategories = state.customCategories.filter(function (c) {
      return c.id !== categoryId;
    });
    idsToRemove.forEach(function (id) {
      delete state.progress[id];
    });
    saveCustomWords();
    saveCustomCategories();
    saveProgress();
    if (state.day === 'custom-' + categoryId) {
      state.day = 'all';
    }
    if (state.manage.targetCategoryId === categoryId) {
      state.manage.targetCategoryId = state.customCategories.length > 0 ? state.customCategories[0].id : null;
    }
    buildDeck();
  }

  function deleteCustomWord(id) {
    state.customWords = state.customWords.filter(function (w) {
      return w.id !== id;
    });
    delete state.progress[id];
    saveCustomWords();
    saveProgress();
  }

  var WEAK_THRESHOLD = 2;
  var MASTERED_THRESHOLD = 2;

  function isWeak(entry) {
    return (entry.wrong || 0) >= WEAK_THRESHOLD;
  }
  // One definition of 암기완료 everywhere: the saved status, which flashcards
  // set directly and quizzes set after MASTERED_THRESHOLD correct answers.
  function isMastered(entry) {
    return entry.status === 'known';
  }

  function getPool() {
    if (state.day === 'all') return WORDS;
    if (state.day === 'custom-all') return state.customWords;
    if (typeof state.day === 'string' && state.day.indexOf('custom-') === 0) {
      var catId = state.day.slice('custom-'.length);
      return state.customWords.filter(function (w) {
        return w.categoryId === catId;
      });
    }
    return WORDS.filter(function (w) {
      return w.day === state.day;
    });
  }

  function buildDeck() {
    var pool =
      state.cardFilter === 'all'
        ? getPool()
        : getPool().filter(function (w) {
            return getEntry(w.id).status === state.cardFilter;
          });
    state.cardDeck = shuffle(pool);
    state.cardIndex = 0;
    state.cardFlipped = false;
  }
  buildDeck();

  function renderDaySelect() {
    var sel = document.getElementById('day-select');
    var html = '<optgroup label="TOEIC 800~900">';
    html += '<option value="all">전체 (Day 1~30)</option>';
    for (var d = 1; d <= TOTAL_DAYS; d++) {
      html += '<option value="' + d + '">Day ' + d + '</option>';
    }
    html += '</optgroup>';
    if (state.customCategories.length > 0) {
      html += '<optgroup label="내 단어장">';
      html += '<option value="custom-all">내 단어 전체 (' + state.customWords.length + ')</option>';
      var sortedCats = state.customCategories.slice().sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
      sortedCats.forEach(function (cat) {
        var count = state.customWords.filter(function (w) {
          return w.categoryId === cat.id;
        }).length;
        html += '<option value="custom-' + cat.id + '">' + esc(cat.name) + ' (' + count + ')</option>';
      });
      html += '</optgroup>';
    }
    sel.innerHTML = html;
    sel.value = String(state.day);
    if (sel.value !== String(state.day)) {
      state.day = 'all';
      sel.value = 'all';
    }
    if (!sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', function (e) {
        var v = e.target.value;
        if (v === 'all' || v === 'custom-all' || v.indexOf('custom-') === 0) {
          state.day = v;
        } else {
          state.day = parseInt(v, 10);
        }
        buildDeck();
        state.quiz = { stage: 'setup', mode: state.quiz.mode, questions: [], index: 0, selected: null, score: 0, wrong: [] };
        state.write = { stage: 'setup', items: [], index: 0, input: '', submitted: false, score: 0, wrong: [] };
        render();
      });
    }
  }

  var TABS = [
    { key: 'cards', label: '📇 플래시카드' },
    { key: 'quiz', label: '📝 퀴즈' },
    { key: 'write', label: '✍️ 쓰기' },
    { key: 'words', label: '📚 단어장' },
    { key: 'manage', label: '🗂️ 내 단어장' },
    { key: 'stats', label: '📊 통계' },
  ];

  function renderTabs() {
    var el = document.getElementById('tabs');
    el.innerHTML = TABS.map(function (t) {
      return (
        '<button data-tab="' +
        t.key +
        '" class="' +
        (state.tab === t.key ? 'active' : '') +
        '">' +
        t.label +
        '</button>'
      );
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () {
        state.tab = btn.getAttribute('data-tab');
        if (state.tab === 'quiz') {
          state.quiz = { stage: 'setup', mode: state.quiz.mode, questions: [], index: 0, selected: null, score: 0, wrong: [] };
        }
        if (state.tab === 'write') {
          state.write = { stage: 'setup', items: [], index: 0, input: '', submitted: false, score: 0, wrong: [] };
        }
        render();
      });
    });
  }

  function dayBadge(w) {
    if (w.day !== undefined) return 'Day ' + w.day;
    var cat = findCategory(w.categoryId);
    return cat ? cat.name : '내 단어';
  }

  function renderCards() {
    var panel = document.getElementById('panel');
    var filters = [
      { key: 'all', label: '전체' },
      { key: 'new', label: '신규' },
      { key: 'learning', label: '학습중' },
      { key: 'known', label: '암기완료' },
    ];
    var chipRow = filters
      .map(function (f) {
        return (
          '<button class="chip ' +
          (state.cardFilter === f.key ? 'active' : '') +
          '" data-filter="' +
          f.key +
          '">' +
          f.label +
          '</button>'
        );
      })
      .join('');

    var body = '';
    if (state.cardDeck.length === 0) {
      body = '<div class="empty"><p>이 카테고리에는 단어가 없어요.</p></div>';
    } else if (state.cardIndex >= state.cardDeck.length) {
      body =
        '<div class="empty"><p>🎉 이번 세트를 모두 학습했어요!</p>' +
        '<div class="setup-row">' +
        '<button class="btn btn-ghost" id="card-prev">◀ 이전</button>' +
        '<button class="btn btn-primary" id="restart-deck">다시 섞어서 학습하기</button>' +
        '</div></div>';
    } else {
      var w = state.cardDeck[state.cardIndex];
      body =
        '<p class="meta">' +
        (state.cardIndex + 1) +
        ' / ' +
        state.cardDeck.length +
        '</p>' +
        '<div class="card ' +
        (state.cardFlipped ? 'flipped' : '') +
        '" id="flip-card">' +
        '<div class="card-inner">' +
        '<div class="face front">' +
        '<span class="level-badge">' +
        esc(dayBadge(w)) +
        '</span>' +
        '<h2>' +
        esc(w.en) +
        '</h2>' +
        '<p class="hint">클릭해서 뜻 보기</p>' +
        '</div>' +
        '<div class="face back">' +
        '<h3>' +
        esc(w.ko) +
        '</h3>' +
        '<p class="example">' +
        esc(w.example || '') +
        '</p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="nav-row setup-row">' +
        '<button class="btn btn-ghost" id="card-prev" ' +
        (state.cardIndex === 0 ? 'disabled' : '') +
        '>◀ 이전</button>' +
        '<button class="btn btn-ghost" id="card-next">다음 ▶</button>' +
        '</div>' +
        '<div class="answer-row">' +
        '<button class="btn btn-bad" id="ans-no">🙈 몰라요</button>' +
        '<button class="btn btn-good" id="ans-yes">✅ 알아요</button>' +
        '</div>';
    }

    panel.innerHTML = '<div class="chiprow">' + chipRow + '</div>' + body;

    Array.prototype.forEach.call(panel.querySelectorAll('.chip'), function (c) {
      c.addEventListener('click', function () {
        state.cardFilter = c.getAttribute('data-filter');
        buildDeck();
        render();
      });
    });
    var flipEl = document.getElementById('flip-card');
    if (flipEl)
      flipEl.addEventListener('click', function () {
        state.cardFlipped = !state.cardFlipped;
        render();
      });
    var yes = document.getElementById('ans-yes');
    var no = document.getElementById('ans-no');
    if (yes)
      yes.addEventListener('click', function () {
        setStatus(state.cardDeck[state.cardIndex].id, 'known');
        state.cardIndex++;
        state.cardFlipped = false;
        render();
      });
    if (no)
      no.addEventListener('click', function () {
        setStatus(state.cardDeck[state.cardIndex].id, 'learning');
        state.cardIndex++;
        state.cardFlipped = false;
        render();
      });
    var restart = document.getElementById('restart-deck');
    if (restart)
      restart.addEventListener('click', function () {
        buildDeck();
        render();
      });
    var prevBtn = document.getElementById('card-prev');
    if (prevBtn)
      prevBtn.addEventListener('click', function () {
        if (state.cardIndex > 0) {
          state.cardIndex--;
          state.cardFlipped = false;
          render();
        }
      });
    var nextBtn = document.getElementById('card-next');
    if (nextBtn)
      nextBtn.addEventListener('click', function () {
        if (state.cardIndex < state.cardDeck.length) {
          state.cardIndex++;
          state.cardFlipped = false;
          render();
        }
      });
  }

  function normalizeOptionKey(s) {
    return String(s).trim().toLowerCase();
  }

  function pickUniqueDistractors(pool, excludeId, usedKeys, keyFn, count) {
    var candidates = shuffle(
      pool.filter(function (w) {
        return w.id !== excludeId;
      }),
    );
    var result = [];
    for (var i = 0; i < candidates.length && result.length < count; i++) {
      var cand = candidates[i];
      var key = normalizeOptionKey(keyFn(cand));
      if (usedKeys[key]) continue;
      usedKeys[key] = true;
      result.push(keyFn(cand));
    }
    return result;
  }

  var IDK_OPTION = '모르겠어요';

  function buildQuestionsFromWords(words, mode, preserveOrder) {
    mode = mode === 'ko2en' ? 'ko2en' : 'en2ko';
    var distractorPool = words.length > 4 ? words : WORDS;
    var keyFn =
      mode === 'ko2en'
        ? function (w) {
            return w.en;
          }
        : function (w) {
            return w.ko;
          };
    var orderedWords = preserveOrder ? words : shuffle(words);
    return orderedWords.map(function (word) {
      var answer = keyFn(word);
      var usedKeys = {};
      usedKeys[normalizeOptionKey(answer)] = true;
      var distractors = pickUniqueDistractors(distractorPool, word.id, usedKeys, keyFn, 3);
      var options = shuffle([answer].concat(distractors)).concat([IDK_OPTION]);
      return { word: word, mode: mode, answer: answer, options: options };
    });
  }

  // Splits a pool into words already mastered (status 'known', excluded
  // from quiz) vs. the rest, further separating frequently-missed "important"
  // words so they can be placed at the end of the quiz session.
  function splitQuizPool(pool) {
    var mastered = [];
    var normal = [];
    var important = [];
    pool.forEach(function (w) {
      var entry = getEntry(w.id);
      if (isMastered(entry)) mastered.push(w);
      else if (isWeak(entry)) important.push(w);
      else normal.push(w);
    });
    return { mastered: mastered, normal: normal, important: important };
  }

  function buildReviewQuestions(normalWords, importantWords, count, mode) {
    var selectedImportant = shuffle(importantWords).slice(0, count);
    var remainingSlots = count - selectedImportant.length;
    var selectedNormal = shuffle(normalWords).slice(0, Math.max(remainingSlots, 0));
    var orderedWords = selectedNormal.concat(selectedImportant);
    return buildQuestionsFromWords(orderedWords, mode, true);
  }

  function renderQuiz() {
    var panel = document.getElementById('panel');
    var q = state.quiz;

    if (q.stage === 'setup') {
      var pool = getPool();
      if (pool.length === 0) {
        panel.innerHTML = '<h2>퀴즈 시작하기</h2><div class="empty"><p>이 범위에는 단어가 없어요.</p></div>';
        return;
      }
      var split = splitQuizPool(pool);
      var remaining = split.normal.concat(split.important);
      var progressHint = '암기완료 ' + split.mastered.length + ' / ' + pool.length;

      if (remaining.length === 0) {
        panel.innerHTML =
          '<h2>퀴즈 시작하기</h2>' +
          '<div class="empty"><p>🎉 이 범위 단어를 모두 암기했어요! (' +
          split.mastered.length +
          '/' +
          pool.length +
          ')</p>' +
          '<button class="btn btn-primary" id="review-all-btn" style="flex:none;padding:12px 20px;">전체 다시 복습하기</button></div>';
        document.getElementById('review-all-btn').addEventListener('click', function () {
          state.quiz = {
            stage: 'playing',
            mode: q.mode,
            questions: buildQuestionsFromWords(pool, q.mode),
            index: 0,
            selected: null,
            score: 0,
            wrong: [],
          };
          render();
        });
        return;
      }

      if (remaining.length < 4) {
        panel.innerHTML =
          '<h2>퀴즈 시작하기</h2>' +
          '<div class="empty"><p>암기 안 된 단어가 ' +
          remaining.length +
          '개뿐이라 퀴즈를 만들 수 없어요. (최소 4개 필요)</p>' +
          '<p class="hint">' +
          progressHint +
          '</p></div>';
        return;
      }

      var counts = [10, 20, 50, remaining.length].filter(function (n, idx, arr) {
        return n <= remaining.length && arr.indexOf(n) === idx;
      });
      var importantHtml = '';
      if (split.important.length > 0) {
        importantHtml =
          '<div class="quiz-important"><h3>⭐ 중요한 단어 (2번 이상 틀림) · ' +
          split.important.length +
          '개</h3>' +
          '<ul class="important-list">' +
          split.important
            .map(function (w) {
              return '<li><strong>' + esc(w.en) + '</strong> — ' + esc(w.ko) + '</li>';
            })
            .join('') +
          '</ul></div>';
      }

      panel.innerHTML =
        '<h2>퀴즈 시작하기</h2>' +
        '<div class="setup-row mode-row" style="margin-bottom:14px;">' +
        '<button class="btn ' +
        (q.mode === 'ko2en' ? 'btn-ghost' : 'btn-primary') +
        '" data-mode="en2ko">단어 → 뜻</button>' +
        '<button class="btn ' +
        (q.mode === 'ko2en' ? 'btn-primary' : 'btn-ghost') +
        '" data-mode="ko2en">뜻 → 단어</button>' +
        '</div>' +
        '<p class="hint" style="margin-bottom:16px;">몇 문제를 풀어볼까요? (' +
        remaining.length +
        '개 단어 중에서 출제 · ' +
        progressHint +
        ')</p>' +
        '<div class="setup-row">' +
        counts
          .map(function (n) {
            return (
              '<button class="btn btn-primary" data-count="' + n + '">' + (n === remaining.length ? '전체' : n + '문제') + '</button>'
            );
          })
          .join('') +
        '</div>' +
        importantHtml;
      Array.prototype.forEach.call(panel.querySelectorAll('[data-mode]'), function (btn) {
        btn.addEventListener('click', function () {
          q.mode = btn.getAttribute('data-mode');
          render();
        });
      });
      Array.prototype.forEach.call(panel.querySelectorAll('[data-count]'), function (btn) {
        btn.addEventListener('click', function () {
          var count = parseInt(btn.getAttribute('data-count'), 10);
          state.quiz = {
            stage: 'playing',
            mode: q.mode,
            questions: buildReviewQuestions(split.normal, split.important, count, q.mode),
            index: 0,
            selected: null,
            score: 0,
            wrong: [],
          };
          render();
        });
      });
      return;
    }

    if (q.stage === 'finished') {
      var wrongHtml = '';
      if (q.wrong.length > 0) {
        wrongHtml =
          '<div class="wrong-list"><h3>틀린 단어</h3><ul>' +
          q.wrong
            .map(function (w) {
              return '<li><strong>' + esc(w.en) + '</strong> — ' + esc(w.ko) + '</li>';
            })
            .join('') +
          '</ul></div>';
      }
      panel.innerHTML =
        '<h2>퀴즈 결과</h2>' +
        '<p class="score">' +
        q.score +
        ' / ' +
        q.questions.length +
        ' 정답</p>' +
        wrongHtml +
        '<div class="setup-row">' +
        (q.wrong.length > 0 ? '<button class="btn btn-bad" id="retry-wrong">틀린 것만 다시 풀기</button>' : '') +
        '<button class="btn btn-primary" id="retry-all">전체 다시 풀기</button>' +
        '</div>';
      var retryWrongBtn = document.getElementById('retry-wrong');
      if (retryWrongBtn) {
        retryWrongBtn.addEventListener('click', function () {
          var wrongWords = q.wrong.slice();
          state.quiz = {
            stage: 'playing',
            mode: q.mode,
            questions: buildQuestionsFromWords(wrongWords, q.mode),
            index: 0,
            selected: null,
            score: 0,
            wrong: [],
          };
          render();
        });
      }
      document.getElementById('retry-all').addEventListener('click', function () {
        state.quiz = { stage: 'setup', mode: q.mode, questions: [], index: 0, selected: null, score: 0, wrong: [] };
        render();
      });
      return;
    }

    var current = q.questions[q.index];
    var isLast = q.index === q.questions.length - 1;
    var promptText = current.mode === 'ko2en' ? current.word.ko : current.word.en;
    var promptLabel = current.mode === 'ko2en' ? '알맞은 영단어를 고르세요' : '알맞은 뜻을 고르세요';
    var optsHtml = current.options
      .map(function (opt) {
        var cls = 'option';
        if (opt === IDK_OPTION) cls += ' option-idk';
        if (q.selected) {
          if (opt === current.answer) cls += ' correct';
          else if (opt === q.selected) cls += ' wrong';
        }
        return '<button class="' + cls + '" data-opt="' + esc(opt) + '" ' + (q.selected ? 'disabled' : '') + '>' + esc(opt) + '</button>';
      })
      .join('');

    panel.innerHTML =
      '<p class="meta">' +
      (q.index + 1) +
      ' / ' +
      q.questions.length +
      '</p>' +
      '<h2 class="quiz-word" style="' +
      (current.mode === 'ko2en' ? 'font-size:24px;' : '') +
      '">' +
      esc(promptText) +
      '</h2>' +
      '<p class="hint" style="text-align:center;">' +
      promptLabel +
      '</p>' +
      '<div class="options">' +
      optsHtml +
      '</div>' +
      (q.selected ? '<button class="btn btn-primary" id="next-q">' + (isLast ? '결과 보기' : '다음 문제') + '</button>' : '');

    if (!q.selected) {
      Array.prototype.forEach.call(panel.querySelectorAll('[data-opt]'), function (btn) {
        btn.addEventListener('click', function () {
          var opt = btn.getAttribute('data-opt');
          var isCorrect = opt === current.answer;
          q.selected = opt;
          recordResult(current.word.id, isCorrect);
          if (isCorrect) q.score++;
          else q.wrong.push(current.word);
          render();
        });
      });
    } else {
      document.getElementById('next-q').addEventListener('click', function () {
        if (isLast) {
          q.stage = 'finished';
        } else {
          q.index++;
          q.selected = null;
        }
        render();
      });
    }
  }

  function writeSetupCounts() {
    var poolSize = getPool().length;
    var options = [10, 20, 50];
    return options
      .filter(function (n) {
        return n <= poolSize;
      })
      .concat([poolSize]);
  }

  function renderWrite() {
    var panel = document.getElementById('panel');
    var w = state.write;

    if (w.stage === 'setup') {
      var poolSize = getPool().length;
      if (poolSize < 1) {
        panel.innerHTML = '<h2>스펠링 쓰기 연습</h2><div class="empty"><p>이 범위에는 아직 단어가 없어요.</p></div>';
        return;
      }
      var counts = writeSetupCounts();
      panel.innerHTML =
        '<h2>스펠링 쓰기 연습</h2>' +
        '<p class="hint" style="margin-bottom:16px;">뜻을 보고 영단어 스펠링을 입력하세요 (' +
        poolSize +
        '개 단어 중에서 출제)</p>' +
        '<div class="setup-row">' +
        counts
          .map(function (n) {
            return '<button class="btn btn-primary" data-count="' + n + '">' + (n === poolSize ? '전체' : n + '문제') + '</button>';
          })
          .join('') +
        '</div>';
      Array.prototype.forEach.call(panel.querySelectorAll('[data-count]'), function (btn) {
        btn.addEventListener('click', function () {
          var count = parseInt(btn.getAttribute('data-count'), 10);
          state.write = {
            stage: 'playing',
            items: shuffle(getPool()).slice(0, count),
            index: 0,
            input: '',
            submitted: false,
            score: 0,
            wrong: [],
          };
          render();
        });
      });
      return;
    }

    if (w.stage === 'finished') {
      var wrongHtml = '';
      if (w.wrong.length > 0) {
        wrongHtml =
          '<div class="wrong-list"><h3>틀린 단어</h3><ul>' +
          w.wrong
            .map(function (item) {
              return (
                '<li><strong>' +
                esc(item.word.en) +
                '</strong> — ' +
                esc(item.word.ko) +
                '<br/><span class="hint">내가 쓴 답: ' +
                esc(item.attempt || '(빈칸)') +
                '</span></li>'
              );
            })
            .join('') +
          '</ul></div>';
      }
      panel.innerHTML =
        '<h2>쓰기 연습 결과</h2>' +
        '<p class="score">' +
        w.score +
        ' / ' +
        w.items.length +
        ' 정답</p>' +
        wrongHtml +
        '<div class="setup-row">' +
        (w.wrong.length > 0 ? '<button class="btn btn-bad" id="retry-write-wrong">틀린 것만 다시 풀기</button>' : '') +
        '<button class="btn btn-primary" id="retry-write-all">전체 다시 풀기</button>' +
        '</div>';
      var retryWriteWrongBtn = document.getElementById('retry-write-wrong');
      if (retryWriteWrongBtn) {
        retryWriteWrongBtn.addEventListener('click', function () {
          var wrongWords = w.wrong.map(function (item) {
            return item.word;
          });
          state.write = {
            stage: 'playing',
            items: shuffle(wrongWords),
            index: 0,
            input: '',
            submitted: false,
            score: 0,
            wrong: [],
          };
          render();
        });
      }
      document.getElementById('retry-write-all').addEventListener('click', function () {
        state.write = { stage: 'setup', items: [], index: 0, input: '', submitted: false, score: 0, wrong: [] };
        render();
      });
      return;
    }

    var current = w.items[w.index];
    var isLast = w.index === w.items.length - 1;
    var isCorrect = w.submitted && normalizeAnswer(w.input) === normalizeAnswer(current.en);

    panel.innerHTML =
      '<p class="meta">' +
      (w.index + 1) +
      ' / ' +
      w.items.length +
      '</p>' +
      '<div class="write-prompt">' +
      '<span class="level-badge">' +
      esc(dayBadge(current)) +
      '</span>' +
      '<h2 class="write-ko">' +
      esc(current.ko) +
      '</h2>' +
      '<p class="hint">위 뜻에 해당하는 영단어 스펠링을 입력하세요</p>' +
      '</div>' +
      '<input type="text" id="write-input" class="write-input ' +
      (w.submitted ? (isCorrect ? 'correct' : 'wrong') : '') +
      '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="정답을 입력하세요" value="' +
      esc(w.input) +
      '" ' +
      (w.submitted ? 'disabled' : '') +
      ' />' +
      (w.submitted
        ? '<p class="write-feedback ' +
          (isCorrect ? 'good' : 'bad') +
          '">' +
          (isCorrect ? '✅ 정답이에요!' : '❌ 정답: ' + esc(current.en)) +
          '</p>' +
          '<button class="btn btn-primary" id="write-next">' +
          (isLast ? '결과 보기' : '다음 문제') +
          '</button>'
        : '<button class="btn btn-primary" id="write-submit">확인</button>');

    var input = document.getElementById('write-input');
    if (!w.submitted) {
      input.focus();
      input.addEventListener('input', function (e) {
        w.input = e.target.value;
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submitWrite();
      });
      document.getElementById('write-submit').addEventListener('click', submitWrite);
    } else {
      document.getElementById('write-next').addEventListener('click', function () {
        if (isLast) {
          w.stage = 'finished';
        } else {
          w.index++;
          w.input = '';
          w.submitted = false;
        }
        render();
      });
    }

    function submitWrite() {
      var correct = normalizeAnswer(w.input) === normalizeAnswer(current.en);
      w.submitted = true;
      recordResult(current.id, correct);
      if (correct) {
        w.score++;
      } else {
        w.wrong.push({ word: current, attempt: w.input });
      }
      render();
    }
  }

  var STATUS_LABEL = { new: '신규', learning: '학습중', known: '암기완료' };

  function renderWords() {
    var panel = document.getElementById('panel');
    var query = state.wordQuery.trim().toLowerCase();
    var filtered = getPool().filter(function (w) {
      var entry = getEntry(w.id);
      var matchesQuery =
        query === '' || w.en.toLowerCase().indexOf(query) !== -1 || w.ko.indexOf(state.wordQuery.trim()) !== -1;
      var matchesStatus = state.wordStatus === 'all' || entry.status === state.wordStatus;
      return matchesQuery && matchesStatus;
    });

    var rows =
      filtered
        .map(function (w) {
          var entry = getEntry(w.id);
          return (
            '<li class="wrow"><div class="wmain"><b>' +
            esc(w.en) +
            '</b><span class="wlevel">' +
            esc(dayBadge(w)) +
            '</span></div><div class="wko">' +
            esc(w.ko) +
            '</div><span class="badge ' +
            entry.status +
            '">' +
            STATUS_LABEL[entry.status] +
            '</span></li>'
          );
        })
        .join('') || '<li class="empty">검색 결과가 없어요.</li>';

    var resetControlHtml = state.confirmingReset
      ? '<div class="reset-confirm">' +
        '<span>정말 초기화할까요? 모든 학습 기록이 사라져요.</span>' +
        '<div class="reset-confirm-actions">' +
        '<button class="btn btn-bad" id="reset-confirm-yes">초기화</button>' +
        '<button class="btn btn-primary" id="reset-confirm-no">취소</button>' +
        '</div>' +
        '</div>'
      : '<button class="reset-btn" id="reset-btn">진행 초기화</button>';

    panel.innerHTML =
      '<div class="controls-row">' +
      '<input class="search" id="search-input" type="text" placeholder="단어 또는 뜻 검색" value="' +
      esc(state.wordQuery) +
      '" />' +
      '<select class="select" id="status-select">' +
      '<option value="all">전체 상태</option>' +
      '<option value="new">신규</option>' +
      '<option value="learning">학습중</option>' +
      '<option value="known">암기완료</option>' +
      '</select>' +
      resetControlHtml +
      '</div>' +
      '<ul class="wlist">' +
      rows +
      '</ul>';

    document.getElementById('status-select').value = state.wordStatus;
    document.getElementById('search-input').addEventListener('input', function (e) {
      state.wordQuery = e.target.value;
      render();
    });
    document.getElementById('status-select').addEventListener('change', function (e) {
      state.wordStatus = e.target.value;
      render();
    });
    if (state.confirmingReset) {
      document.getElementById('reset-confirm-yes').addEventListener('click', function () {
        resetProgress();
        state.confirmingReset = false;
        buildDeck();
        render();
      });
      document.getElementById('reset-confirm-no').addEventListener('click', function () {
        state.confirmingReset = false;
        render();
      });
    } else {
      document.getElementById('reset-btn').addEventListener('click', function () {
        state.confirmingReset = true;
        render();
      });
    }
  }

  function renderManage() {
    var panel = document.getElementById('panel');
    var m = state.manage;

    var sortedCats = state.customCategories.slice().sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });

    if (!findCategory(m.targetCategoryId)) {
      m.targetCategoryId = sortedCats.length > 0 ? sortedCats[0].id : null;
    }

    var addCategoryHtml = m.addingCategory
      ? '<div class="inline-form">' +
        '<input type="text" id="new-category-input" class="search" placeholder="카테고리 이름" value="' +
        esc(m.newCategoryName) +
        '" />' +
        '<div class="setup-row">' +
        '<button class="btn btn-primary" id="save-category-btn">만들기</button>' +
        '<button class="btn btn-bad" id="cancel-category-btn">취소</button>' +
        '</div>' +
        '</div>'
      : '<button class="btn-small-primary" id="add-category-btn">+ 새 카테고리</button>';

    var categoriesHtml;
    if (sortedCats.length === 0) {
      categoriesHtml = '<p class="hint">아직 카테고리가 없어요. 아래에서 카테고리를 먼저 만들어보세요.</p>';
    } else {
      categoriesHtml = sortedCats
        .map(function (cat) {
          var wordsInCat = state.customWords.filter(function (w) {
            return w.categoryId === cat.id;
          });
          var collapsed = !!m.collapsed[cat.id];

          var headHtml;
          if (m.renamingCategoryId === cat.id) {
            headHtml =
              '<div class="cat-rename-row">' +
              '<input type="text" id="rename-input" class="search" value="' +
              esc(m.renameValue) +
              '" />' +
              '<button class="btn btn-primary btn-small-inline" id="save-rename-btn">저장</button>' +
              '<button class="btn btn-bad btn-small-inline" id="cancel-rename-btn">취소</button>' +
              '</div>';
          } else {
            headHtml =
              '<div class="cat-head" data-toggle-cat="' +
              cat.id +
              '">' +
              '<span class="cat-title">' +
              esc(cat.name) +
              '</span>' +
              '<span class="cat-count">' +
              wordsInCat.length +
              '개</span>' +
              '<span class="cat-caret">' +
              (collapsed ? '▸' : '▾') +
              '</span>' +
              '</div>';
          }

          var actionsHtml;
          if (m.confirmingDeleteCategoryId === cat.id) {
            actionsHtml =
              '<div class="reset-confirm">' +
              '<span>\'' +
              esc(cat.name) +
              "' 카테고리와 단어 " +
              wordsInCat.length +
              '개를 모두 삭제할까요?</span>' +
              '<div class="reset-confirm-actions">' +
              '<button class="btn btn-bad" id="confirm-delete-cat-btn">삭제</button>' +
              '<button class="btn btn-primary" id="cancel-delete-cat-btn">취소</button>' +
              '</div>' +
              '</div>';
          } else if (m.renamingCategoryId !== cat.id) {
            actionsHtml =
              '<div class="cat-actions">' +
              '<button class="btn-tiny" data-study-cat="' +
              cat.id +
              '">이 묶음 학습하기</button>' +
              '<button class="btn-tiny" data-rename-cat="' +
              cat.id +
              '">이름 바꾸기</button>' +
              '<button class="btn-tiny danger" data-delete-cat="' +
              cat.id +
              '">삭제</button>' +
              '</div>';
          } else {
            actionsHtml = '';
          }

          var bodyHtml = '';
          if (!collapsed && m.renamingCategoryId !== cat.id) {
            if (wordsInCat.length === 0) {
              bodyHtml = '<div class="cat-body"><p class="hint">아직 단어가 없어요.</p></div>';
            } else {
              var categoryOptions = sortedCats
                .map(function (c2) {
                  return '<option value="' + c2.id + '">' + esc(c2.name) + '</option>';
                })
                .join('');
              bodyHtml =
                '<div class="cat-body">' +
                wordsInCat
                  .map(function (w) {
                    return (
                      '<div class="cat-word-row">' +
                      '<div class="cat-word-main"><b>' +
                      esc(w.en) +
                      '</b><span class="cat-word-ko">' +
                      esc(w.ko) +
                      '</span></div>' +
                      '<select class="cat-move-select" data-move-word="' +
                      w.id +
                      '">' +
                      categoryOptions +
                      '</select>' +
                      '<button class="del" data-delete-word="' +
                      w.id +
                      '">삭제</button>' +
                      '</div>'
                    );
                  })
                  .join('') +
                '</div>';
            }
          }

          return '<div class="cat-group">' + headHtml + actionsHtml + bodyHtml + '</div>';
        })
        .join('');
    }

    var categoryOptionsForAdd = sortedCats
      .map(function (c) {
        return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
      })
      .join('');

    var addWordsSectionHtml;
    if (sortedCats.length === 0) {
      addWordsSectionHtml =
        '<div class="manage-card"><p class="hint">단어를 추가하려면 먼저 카테고리를 만들어주세요.</p></div>';
    } else {
      addWordsSectionHtml =
        '<div class="manage-card">' +
        '<h3>담을 카테고리</h3>' +
        '<select class="select full-width" id="target-category-select">' +
        categoryOptionsForAdd +
        '</select>' +
        '</div>' +
        '<div class="manage-card">' +
        '<h3>단어 추가</h3>' +
        '<div class="manage-row2">' +
        '<input type="text" id="new-en" class="search" placeholder="영단어" value="' +
        esc(m.newEn) +
        '" />' +
        '<input type="text" id="new-ko" class="search" placeholder="뜻" value="' +
        esc(m.newKo) +
        '" />' +
        '</div>' +
        '<input type="text" id="new-example" class="search full-width" placeholder="예문 (선택)" value="' +
        esc(m.newExample) +
        '" />' +
        '<button class="btn btn-primary full-width" id="add-word-btn">추가</button>' +
        '</div>' +
        '<div class="manage-card">' +
        '<h3>여러 단어 한 번에 추가</h3>' +
        '<textarea id="bulk-input" class="bulk-textarea" placeholder="한 줄에 하나씩, &quot;영단어 - 뜻&quot; 형식으로 입력하세요.\n예) aircraft - 항공기">' +
        esc(m.bulkText) +
        '</textarea>' +
        '<div class="setup-row" style="margin-top:8px;">' +
        '<button class="btn btn-primary" id="add-bulk-btn">목록에 반영</button>' +
        '<button class="btn btn-bad" id="clear-bulk-btn">지우기</button>' +
        '</div>' +
        '</div>';
    }

    panel.innerHTML =
      '<h2>내 단어장</h2>' +
      '<p class="hint" style="margin-bottom:16px;">카테고리를 만들고, 원하는 카테고리에 단어를 추가해보세요.</p>' +
      '<div class="manage-card">' +
      '<div class="manage-card-head"><h3>카테고리</h3>' +
      addCategoryHtml +
      '</div>' +
      categoriesHtml +
      '</div>' +
      addWordsSectionHtml;

    if (sortedCats.length > 0) {
      var targetSelect = document.getElementById('target-category-select');
      targetSelect.value = m.targetCategoryId;
      targetSelect.addEventListener('change', function (e) {
        m.targetCategoryId = e.target.value;
      });

      document.getElementById('new-en').addEventListener('input', function (e) {
        m.newEn = e.target.value;
      });
      document.getElementById('new-ko').addEventListener('input', function (e) {
        m.newKo = e.target.value;
      });
      document.getElementById('new-example').addEventListener('input', function (e) {
        m.newExample = e.target.value;
      });
      var submitNewWord = function () {
        if (addCustomWord(m.newEn, m.newKo, m.newExample, m.targetCategoryId)) {
          m.newEn = '';
          m.newKo = '';
          m.newExample = '';
          buildDeck();
          render();
        }
      };
      document.getElementById('add-word-btn').addEventListener('click', submitNewWord);
      document.getElementById('new-en').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submitNewWord();
      });
      document.getElementById('new-ko').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submitNewWord();
      });

      var bulkInput = document.getElementById('bulk-input');
      bulkInput.addEventListener('input', function (e) {
        m.bulkText = e.target.value;
      });
      document.getElementById('add-bulk-btn').addEventListener('click', function () {
        var added = addCustomWordsBulk(m.bulkText, m.targetCategoryId);
        if (added > 0) {
          m.bulkText = '';
          buildDeck();
        }
        render();
      });
      document.getElementById('clear-bulk-btn').addEventListener('click', function () {
        m.bulkText = '';
        render();
      });
    }

    if (m.addingCategory) {
      var catInput = document.getElementById('new-category-input');
      catInput.focus();
      catInput.addEventListener('input', function (e) {
        m.newCategoryName = e.target.value;
      });
      catInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') saveNewCategory();
      });
      document.getElementById('save-category-btn').addEventListener('click', saveNewCategory);
      document.getElementById('cancel-category-btn').addEventListener('click', function () {
        m.addingCategory = false;
        m.newCategoryName = '';
        render();
      });
    } else {
      document.getElementById('add-category-btn').addEventListener('click', function () {
        m.addingCategory = true;
        render();
      });
    }
    function saveNewCategory() {
      var id = createCategory(m.newCategoryName);
      if (id) {
        m.addingCategory = false;
        m.newCategoryName = '';
        m.targetCategoryId = id;
        render();
      }
    }

    if (m.renamingCategoryId) {
      var renameInput = document.getElementById('rename-input');
      if (renameInput) {
        renameInput.focus();
        renameInput.addEventListener('input', function (e) {
          m.renameValue = e.target.value;
        });
        renameInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') saveRename();
        });
        document.getElementById('save-rename-btn').addEventListener('click', saveRename);
        document.getElementById('cancel-rename-btn').addEventListener('click', function () {
          m.renamingCategoryId = null;
          render();
        });
      }
    }
    function saveRename() {
      renameCategory(m.renamingCategoryId, m.renameValue);
      m.renamingCategoryId = null;
      render();
    }

    if (m.confirmingDeleteCategoryId) {
      var confirmBtn = document.getElementById('confirm-delete-cat-btn');
      var cancelBtn = document.getElementById('cancel-delete-cat-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
          deleteCategory(m.confirmingDeleteCategoryId);
          m.confirmingDeleteCategoryId = null;
          render();
        });
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          m.confirmingDeleteCategoryId = null;
          render();
        });
      }
    }

    Array.prototype.forEach.call(panel.querySelectorAll('[data-toggle-cat]'), function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-toggle-cat');
        m.collapsed[id] = !m.collapsed[id];
        render();
      });
    });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-study-cat]'), function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = el.getAttribute('data-study-cat');
        state.day = 'custom-' + id;
        state.tab = 'cards';
        buildDeck();
        render();
      });
    });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-rename-cat]'), function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = el.getAttribute('data-rename-cat');
        var cat = findCategory(id);
        m.renamingCategoryId = id;
        m.renameValue = cat ? cat.name : '';
        render();
      });
    });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-delete-cat]'), function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        m.confirmingDeleteCategoryId = el.getAttribute('data-delete-cat');
        render();
      });
    });
    Array.prototype.forEach.call(panel.querySelectorAll('select.cat-move-select'), function (sel) {
      var wordId = sel.getAttribute('data-move-word');
      var word = state.customWords.filter(function (w) {
        return w.id === wordId;
      })[0];
      if (word) sel.value = word.categoryId;
      sel.addEventListener('change', function (e) {
        moveWordToCategory(wordId, e.target.value);
        render();
      });
    });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-delete-word]'), function (el) {
      el.addEventListener('click', function () {
        deleteCustomWord(el.getAttribute('data-delete-word'));
        buildDeck();
        render();
      });
    });
  }

  function renderStats() {
    var panel = document.getElementById('panel');
    var known = 0,
      learning = 0,
      neu = 0,
      correct = 0,
      wrong = 0;
    WORDS.forEach(function (w) {
      var entry = state.progress[w.id];
      var status = entry ? entry.status : 'new';
      if (status === 'known') known++;
      else if (status === 'learning') learning++;
      else neu++;
      correct += (entry && entry.correct) || 0;
      wrong += (entry && entry.wrong) || 0;
    });
    var total = WORDS.length;
    var knownPct = Math.round((known / total) * 100);
    var accuracyText =
      correct + wrong > 0
        ? Math.round((correct / (correct + wrong)) * 100) + '% (정답 ' + correct + ' / 오답 ' + wrong + ')'
        : '아직 퀴즈나 쓰기 연습을 하지 않았어요.';

    var dayRows = '';
    for (var d = 1; d <= TOTAL_DAYS; d++) {
      var dayWords = WORDS.filter(function (w) {
        return w.day === d;
      });
      var dayKnown = dayWords.filter(function (w) {
        return getEntry(w.id).status === 'known';
      }).length;
      var pct = Math.round((dayKnown / dayWords.length) * 100);
      dayRows +=
        '<div class="day-progress-row"><span class="day-progress-label">Day ' +
        d +
        '</span><div class="pbar-o small"><div class="pbar-i" style="width:' +
        pct +
        '%"></div></div><span class="day-progress-pct">' +
        pct +
        '%</span></div>';
    }

    var customStatsHtml = '';
    if (state.customWords.length > 0) {
      var customKnown = state.customWords.filter(function (w) {
        return getEntry(w.id).status === 'known';
      }).length;
      var catRows = state.customCategories
        .slice()
        .sort(function (a, b) {
          return b.createdAt - a.createdAt;
        })
        .map(function (cat) {
          var catWords = state.customWords.filter(function (w) {
            return w.categoryId === cat.id;
          });
          if (catWords.length === 0) return '';
          var catKnown = catWords.filter(function (w) {
            return getEntry(w.id).status === 'known';
          }).length;
          var catPct = Math.round((catKnown / catWords.length) * 100);
          return (
            '<div class="day-progress-row"><span class="day-progress-label" style="width:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
            esc(cat.name) +
            '</span><div class="pbar-o small"><div class="pbar-i" style="width:' +
            catPct +
            '%"></div></div><span class="day-progress-pct">' +
            catPct +
            '%</span></div>'
          );
        })
        .join('');
      customStatsHtml =
        '<div class="quiz-stat"><h3>내 단어장 현황</h3>' +
        '<p class="hint" style="margin-bottom:8px;">전체 ' +
        state.customWords.length +
        '개 중 ' +
        customKnown +
        '개 암기완료</p>' +
        '<div class="day-progress-list">' +
        catRows +
        '</div></div>';
    }

    panel.innerHTML =
      '<h2>학습 통계</h2>' +
      '<div class="stat-grid">' +
      '<div class="stat-card"><span class="stat-num">' +
      total +
      '</span><span class="stat-lbl">전체 단어</span></div>' +
      '<div class="stat-card good"><span class="stat-num">' +
      known +
      '</span><span class="stat-lbl">암기완료</span></div>' +
      '<div class="stat-card bad"><span class="stat-num">' +
      learning +
      '</span><span class="stat-lbl">학습중</span></div>' +
      '<div class="stat-card"><span class="stat-num">' +
      neu +
      '</span><span class="stat-lbl">신규</span></div>' +
      '</div>' +
      '<div class="pbar-o"><div class="pbar-i" style="width:' +
      knownPct +
      '%"></div></div>' +
      '<p class="hint" style="margin-top:8px;">암기 완료율 ' +
      knownPct +
      '%</p>' +
      '<div class="quiz-stat"><h3>퀴즈 · 쓰기 정답률</h3><p>' +
      accuracyText +
      '</p></div>' +
      '<div class="quiz-stat"><h3>Day별 암기 완료율</h3><div class="day-progress-list">' +
      dayRows +
      '</div></div>' +
      customStatsHtml +
      backupHtml();
    bindBackup();
  }

  // ---------------- 기록 백업 / 불러오기 ----------------
  // 기록은 이 브라우저에만 저장돼요. 카톡 안 브라우저 ↔ 사파리·크롬처럼 다른 브라우저로 옮길 때 코드로 옮겨요.
  function exportCode() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('vocab-') === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return 'ENV1:' + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  }
  function importCode(code) {
    var raw = String(code || '').trim();
    if (raw.indexOf('ENV1:') !== 0) throw new Error('bad');
    var data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(5)))));
    Object.keys(data).forEach(function (k) {
      if (k.indexOf('vocab-') === 0 && typeof data[k] === 'string') localStorage.setItem(k, data[k]);
    });
  }
  function backupHtml() {
    return (
      '<div class="quiz-stat backup-card"><h3>💾 기록 백업</h3>' +
      '<p class="hint">외운 기록은 지금 쓰는 브라우저에만 저장돼요. 다른 폰·브라우저로 옮기거나 기록이 지워질 때를 대비해 백업 코드를 저장해 두세요.</p>' +
      '<div class="setup-row"><button class="btn btn-primary" id="backup-copy">백업 코드 복사</button></div>' +
      '<textarea class="backup-text" id="backup-text" placeholder="여기에 백업 코드를 붙여넣고 불러오기를 누르세요"></textarea>' +
      '<div class="setup-row"><button class="btn btn-ghost" id="backup-load">붙여넣은 코드 불러오기</button></div>' +
      '<p class="hint" id="backup-msg"></p></div>'
    );
  }
  function bindBackup() {
    var msg = document.getElementById('backup-msg');
    var ta = document.getElementById('backup-text');
    document.getElementById('backup-copy').addEventListener('click', function () {
      var code = exportCode();
      ta.value = code;
      ta.select();
      var fallback = function () {
        msg.textContent = '아래 코드를 길게 눌러 전체 선택 후 복사해 주세요.';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () {
          msg.textContent = '✅ 복사했어요! 메모장이나 카톡 나와의 채팅에 붙여넣어 보관하세요.';
        }, fallback);
      } else {
        fallback();
      }
    });
    document.getElementById('backup-load').addEventListener('click', function () {
      try {
        importCode(ta.value);
        msg.textContent = '✅ 불러왔어요! 새로고침할게요.';
        setTimeout(function () {
          location.reload();
        }, 600);
      } catch (e) {
        msg.textContent = '⚠️ 코드가 올바르지 않아요. "ENV1:"로 시작하는 코드 전체를 붙여넣어 주세요.';
      }
    });
  }

  function render() {
    var active = document.activeElement;
    var activeId = active && active.id;
    var selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    var selEnd = active && typeof active.selectionEnd === 'number' ? active.selectionEnd : null;

    renderDaySelect();
    renderTabs();
    if (state.tab === 'cards') renderCards();
    else if (state.tab === 'quiz') renderQuiz();
    else if (state.tab === 'write') renderWrite();
    else if (state.tab === 'words') renderWords();
    else if (state.tab === 'manage') renderManage();
    else if (state.tab === 'stats') renderStats();

    if (activeId) {
      var el = document.getElementById(activeId);
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        el.focus();
        if (selStart !== null && el.setSelectionRange) {
          try {
            el.setSelectionRange(selStart, selEnd);
          } catch (e) {}
        }
      }
    }
  }

  render();
})();
