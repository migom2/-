(function () {
  var STORAGE_KEY = 'zh-vocab-progress-v1';
  var TOTAL_DAYS = 100;
  var TONE_LABELS = { 1: '1성', 2: '2성', 3: '3성', 4: '4성', 5: '경성' };

  var TONE_MAP = {
    ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
    ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
    ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
    ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
    ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
    ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
  };

  function parseSyllable(syl) {
    for (var i = 0; i < syl.length; i++) {
      var hit = TONE_MAP[syl[i]];
      if (hit) {
        return { plain: syl.slice(0, i) + hit[0] + syl.slice(i + 1), tone: hit[1] };
      }
    }
    return { plain: syl, tone: 5 };
  }

  function splitPinyin(pinyin) {
    return String(pinyin).trim().split(/\s+/);
  }

  function wordSyllables(w) {
    var chars = String(w.hanzi).split('');
    var sylls = splitPinyin(w.pinyin);
    return chars.map(function (ch, i) {
      var parsed = parseSyllable(sylls[i] || '');
      return { char: ch, plain: parsed.plain, tone: parsed.tone };
    });
  }

  // 마지막으로 고른 학습 범위(Day)를 기억해요. 다시 열면 전체가 아니라 그 Day로 시작.
  function loadDay() {
    try {
      var v = localStorage.getItem('zh-vocab-day');
      return v && v !== 'all' ? parseInt(v, 10) || 'all' : 'all';
    } catch (e) {
      return 'all';
    }
  }
  function saveDay() {
    try {
      localStorage.setItem('zh-vocab-day', String(state.day));
    } catch (e) {}
  }

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
    // 2번 맞히면 외운 단어(암기완료). 이미 외운 단어는 맞히는 동안 그대로 유지.
    var known = isCorrect && (entry.status === 'known' || correct >= MASTERED_THRESHOLD);
    state.progress[id] = {
      correct: correct,
      wrong: (entry.wrong || 0) + (isCorrect ? 0 : 1),
      status: known ? 'known' : 'learning',
    };
    saveProgress();
  }

  var MASTERED_THRESHOLD = 2;
  function isMastered(w) {
    return getEntry(w.id).status === 'known';
  }
  // 구역별 외운 단어: 병음 퀴즈 / 한자 퀴즈 / 성조 게임은 따로따로 기록해요. (한자 조립은 한자 단위로 따로 기록)
  var SECTION_NAMES = { pinyin: '병음 퀴즈', hanzi: '한자 퀴즈', tone: '성조 게임', build: '한자 조립' };
  function loadMastery() {
    var m = null;
    try {
      m = JSON.parse(localStorage.getItem('zh-vocab-mastery-v1') || 'null');
    } catch (e) {}
    m = m && typeof m === 'object' ? m : {};
    ['pinyin', 'hanzi', 'tone'].forEach(function (k) {
      if (!m[k] || typeof m[k] !== 'object') m[k] = {};
    });
    return m;
  }
  var mastery = loadMastery();
  function recordMode(mode, id, isCorrect) {
    var e = mastery[mode][id] || { correct: 0, wrong: 0, status: 'new' };
    var correct = (e.correct || 0) + (isCorrect ? 1 : 0);
    var known = isCorrect && (e.status === 'known' || correct >= MASTERED_THRESHOLD);
    mastery[mode][id] = {
      correct: correct,
      wrong: (e.wrong || 0) + (isCorrect ? 0 : 1),
      status: known ? 'known' : 'learning',
      lastCorrect: isCorrect,
    };
    try {
      localStorage.setItem('zh-vocab-mastery-v1', JSON.stringify(mastery));
    } catch (err) {}
  }
  function modeMastered(mode) {
    var fn = function (w) {
      var e = mastery[mode][w.id];
      return !!e && e.status === 'known';
    };
    fn.partial = function (w) {
      var e = mastery[mode][w.id];
      return !!e && e.status === 'learning' && e.lastCorrect === true;
    };
    return fn;
  }

  function unmasteredOf(pool, masteredFn) {
    var fn = masteredFn || isMastered;
    return pool.filter(function (w) {
      return !fn(w);
    });
  }
  // "외운 단어 2 / 30 · 1번 맞힘 8" — 한 번만 맞힌 것도 보여줘서 기록이 쌓이는 게 보이게
  function masteredHint(pool, masteredFn, noun) {
    var text = '외운 ' + (noun || '단어') + ' ' + (pool.length - unmasteredOf(pool, masteredFn).length) + ' / ' + pool.length;
    if (masteredFn && masteredFn.partial) {
      var half = pool.filter(function (w) {
        return !masteredFn(w) && masteredFn.partial(w);
      }).length;
      if (half > 0) text += ' · 1번 맞힘 ' + half;
    }
    return text;
  }
  // 문제 수 선택 화면 (10문제 · 15문제 · 전체). 외운 단어는 출제하지 않아요.
  function renderCountSetup(panel, intro, pool, onStart, masteredFn, noun, extraHtml) {
    var remaining = unmasteredOf(pool, masteredFn);
    var html =
      '<div class="empty"><p>' +
      intro +
      '</p>' +
      '<p class="meta" style="margin:0">📅 ' +
      (state.day === 'all' ? '전체 (Day 1~' + TOTAL_DAYS + ')' : 'Day ' + state.day) +
      ' · ' +
      masteredHint(pool, masteredFn, noun) +
      '</p>' +
      dayProgressHtml();
    if (pool.length === 0) {
      html += '<p>이 범위에는 단어가 없어요.</p></div>';
      panel.innerHTML = html;
      return;
    }
    if (remaining.length === 0) {
      html +=
        '<p>🎉 모두 외웠어요!</p>' +
        '<button class="btn btn-primary full-width" id="count-review-all">외운 것까지 전체 복습하기</button>' +
        (extraHtml || '') +
        '</div>';
      panel.innerHTML = html;
      document.getElementById('count-review-all').addEventListener('click', function () {
        onStart(shuffle(pool));
      });
      return;
    }
    var counts = [10, 15].filter(function (n) {
      return n < remaining.length;
    });
    counts.push(remaining.length);
    html +=
      '<p class="hint" style="margin:0">몇 문제를 풀어볼까요? (아직 못 외운 ' +
      remaining.length +
      '개 중에서 출제)</p>' +
      '<div class="setup-row" style="width:100%">' +
      counts
        .map(function (n) {
          return (
            '<button class="btn btn-primary" data-count="' +
            n +
            '">' +
            (n === remaining.length ? '전체 (' + n + ')' : n + '문제') +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      (extraHtml || '') +
      '</div>';
    panel.innerHTML = html;
    Array.prototype.forEach.call(panel.querySelectorAll('[data-count]'), function (btn) {
      btn.addEventListener('click', function () {
        var n = parseInt(btn.getAttribute('data-count'), 10);
        onStart(shuffle(remaining).slice(0, n));
      });
    });
  }
  function resetProgress() {
    state.progress = {};
    saveProgress();
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

  var state = {
    day: loadDay(),
    tab: 'cards',
    progress: loadProgress(),
    cardFilter: 'all',
    cardDeck: [],
    cardIndex: 0,
    cardFlipped: false,
    quiz: { stage: 'setup', questions: [], index: 0, selected: null, score: 0, wrong: [] },
    tone: { stage: 'setup', items: [], index: 0, answers: [], checked: false, score: 0, wrong: [] },
    build: { stage: 'setup', items: [], index: 0, tiles: [], picked: [], checked: false, score: 0, wrong: [] },
    buildProgress: loadBuildProgress(),
    wordQuery: '',
    wordStatus: 'all',
    confirmingReset: false,
  };

  function getPool() {
    if (state.day === 'all') return WORDS;
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

  function resetQuiz() {
    state.quiz = { stage: 'setup', questions: [], index: 0, selected: null, score: 0, wrong: [] };
  }
  function resetTone() {
    state.tone = { stage: 'setup', items: [], index: 0, answers: [], checked: false, score: 0, wrong: [] };
  }

  function renderDaySelect() {
    var sel = document.getElementById('day-select');
    var html = '<option value="all">전체 (Day 1~' + TOTAL_DAYS + ')</option>';
    for (var g = 0; g < TOTAL_DAYS / 10; g++) {
      var start = g * 10 + 1;
      var end = start + 9;
      html += '<optgroup label="Day ' + start + '~' + end + '">';
      for (var d = start; d <= end; d++) {
        html += '<option value="' + d + '">Day ' + d + '</option>';
      }
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
        state.day = v === 'all' ? 'all' : parseInt(v, 10);
        saveDay();
        buildDeck();
        resetQuiz();
        resetTone();
        state.build = { stage: 'setup', items: [], index: 0, tiles: [], picked: [], checked: false, score: 0, wrong: [] };
        render();
      });
    }
  }

  var TABS = [
    { key: 'cards', label: '📇 플래시카드' },
    { key: 'quiz', label: '📝 퀴즈' },
    { key: 'tone', label: '🎯 성조 게임' },
    { key: 'build', label: '🧩 한자 조립' },
    { key: 'words', label: '📚 단어장' },
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
        if (state.tab === 'quiz') resetQuiz();
        if (state.tab === 'tone') resetTone();
        render();
      });
    });
  }

  function dayBadge(w) {
    return 'Day ' + w.day + ' · HSK' + w.level;
  }
  function levelBadge(w) {
    return '<span class="lvl-badge lvl' + w.level + '">HSK' + w.level + '</span>';
  }

  // ---------------- 플래시카드 ----------------
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
      body = '<div class="empty"><p>이 범위에는 단어가 없어요.</p></div>';
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
        esc(w.pinyin) +
        '</h2>' +
        '<p class="hint">클릭해서 한자·뜻 보기</p>' +
        '</div>' +
        '<div class="face back">' +
        '<p class="back-hanzi hanzi">' +
        esc(w.hanzi) +
        '</p>' +
        '<p class="back-pinyin">' +
        esc(w.pinyin) +
        '</p>' +
        '<h3>' +
        esc(w.ko) +
        '</h3>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="answer-row">' +
        '<button class="btn btn-bad" id="mark-unknown">😵 몰라요</button>' +
        '<button class="btn btn-good" id="mark-known">✅ 알아요</button>' +
        '</div>' +
        '<div class="setup-row nav-row" style="margin-top:10px">' +
        '<button class="btn btn-ghost" id="card-prev" ' +
        (state.cardIndex === 0 ? 'disabled' : '') +
        '>◀ 이전</button>' +
        '<button class="btn btn-ghost" id="card-skip">다음 ▶</button>' +
        '</div>';
    }

    panel.innerHTML = '<div class="chiprow">' + chipRow + '</div>' + body;

    Array.prototype.forEach.call(panel.querySelectorAll('[data-filter]'), function (btn) {
      btn.addEventListener('click', function () {
        state.cardFilter = btn.getAttribute('data-filter');
        buildDeck();
        render();
      });
    });
    var flip = document.getElementById('flip-card');
    if (flip) {
      flip.addEventListener('click', function () {
        state.cardFlipped = !state.cardFlipped;
        render();
      });
    }
    var known = document.getElementById('mark-known');
    var unknown = document.getElementById('mark-unknown');
    if (known) {
      known.addEventListener('click', function (e) {
        e.stopPropagation();
        setStatus(state.cardDeck[state.cardIndex].id, 'known');
        state.cardIndex++;
        state.cardFlipped = false;
        render();
      });
    }
    if (unknown) {
      unknown.addEventListener('click', function (e) {
        e.stopPropagation();
        setStatus(state.cardDeck[state.cardIndex].id, 'learning');
        state.cardIndex++;
        state.cardFlipped = false;
        render();
      });
    }
    var skip = document.getElementById('card-skip');
    if (skip) {
      skip.addEventListener('click', function () {
        state.cardIndex++;
        state.cardFlipped = false;
        render();
      });
    }
    var prev = document.getElementById('card-prev');
    if (prev) {
      prev.addEventListener('click', function () {
        state.cardIndex = Math.max(0, state.cardIndex - 1);
        state.cardFlipped = false;
        render();
      });
    }
    var restart = document.getElementById('restart-deck');
    if (restart) {
      restart.addEventListener('click', function () {
        buildDeck();
        render();
      });
    }
  }

  // ---------------- 병음 퀴즈 (뜻+한자 → 병음 객관식) ----------------
  var IDK_OPTION = '모르겠어요';
  // mode 'pinyin': 한자·뜻 보고 병음 고르기 / 'hanzi': 뜻·병음 보고 한자 고르기
  function buildQuizQuestions(words, mode) {
    var pool = getPool();
    if (pool.length < 5) pool = WORDS;
    var key = mode === 'hanzi' ? 'hanzi' : 'pinyin';
    return words.map(function (w) {
      var others = pool.filter(function (x) {
        return x.id !== w.id && x[key] !== w[key];
      });
      // 한자 고르기는 글자 수가 같은 단어를 오답으로 우선 써서 헷갈리게
      if (key === 'hanzi') {
        var sameLen = others.filter(function (x) {
          return x.hanzi.length === w.hanzi.length;
        });
        if (sameLen.length >= 4) others = sameLen;
      }
      var seen = {};
      var distractors = [];
      shuffle(others).forEach(function (x) {
        if (distractors.length < 4 && !seen[x[key]]) {
          seen[x[key]] = true;
          distractors.push(x[key]);
        }
      });
      var options = shuffle(distractors.concat([w[key]]));
      options.push(IDK_OPTION);
      return { word: w, options: options, answer: w[key] };
    });
  }

  function renderQuiz() {
    var panel = document.getElementById('panel');
    var pool = getPool();
    var q = state.quiz;

    q.mode = q.mode || 'pinyin';
    function startQuiz(words) {
      q.stage = 'active';
      q.count = words.length;
      q.questions = buildQuizQuestions(words, q.mode);
      q.index = 0;
      q.selected = null;
      q.score = 0;
      q.wrong = [];
      render();
    }

    if (q.stage === 'setup') {
      renderCountSetup(
        panel,
        q.mode === 'hanzi'
          ? '뜻과 병음을 보고 알맞은 한자를 고르는 퀴즈예요. 2번 맞힌 단어는 외운 단어가 되어 더 이상 나오지 않아요.'
          : '뜻과 한자를 보고 알맞은 병음을 고르는 퀴즈예요. 2번 맞힌 단어는 외운 단어가 되어 더 이상 나오지 않아요.',
        pool,
        startQuiz,
        modeMastered(q.mode)
      );
      panel.insertAdjacentHTML(
        'afterbegin',
        '<div class="setup-row quiz-mode-row">' +
          '<button class="btn ' +
          (q.mode === 'pinyin' ? 'btn-primary' : 'btn-ghost') +
          '" data-qmode="pinyin">병음 고르기</button>' +
          '<button class="btn ' +
          (q.mode === 'hanzi' ? 'btn-primary' : 'btn-ghost') +
          '" data-qmode="hanzi">한자 고르기</button>' +
          '</div>'
      );
      Array.prototype.forEach.call(panel.querySelectorAll('[data-qmode]'), function (btn) {
        btn.addEventListener('click', function () {
          q.mode = btn.getAttribute('data-qmode');
          render();
        });
      });
      return;
    }

    if (q.stage === 'active' && q.index >= q.questions.length) {
      q.stage = 'done';
    }

    if (q.stage === 'done') {
      var wrongList = q.wrong
        .map(function (item) {
          return (
            '<li><b class="hanzi">' +
            esc(item.hanzi) +
            '</b> [' +
            esc(item.pinyin) +
            '] ' +
            esc(item.ko) +
            '</li>'
          );
        })
        .join('');
      panel.innerHTML =
        '<div class="score">' +
        q.score +
        ' / ' +
        q.questions.length +
        '</div>' +
        '<p class="meta">' +
        masteredHint(pool, modeMastered(q.mode)) +
        '</p>' +
        (q.wrong.length > 0
          ? '<div class="wrong-list"><h3>틀린 단어</h3><ul>' + wrongList + '</ul></div>'
          : '<p class="hint" style="text-align:center">🎉 전부 맞혔어요!</p>') +
        '<div class="setup-row">' +
        (q.wrong.length > 0 ? '<button class="btn btn-bad" id="retry-wrong">틀린 것만 다시</button>' : '') +
        '<button class="btn btn-primary" id="retry-all">새 문제 풀기</button>' +
        '</div>';
      var retryWrong = document.getElementById('retry-wrong');
      if (retryWrong) {
        retryWrong.addEventListener('click', function () {
          var wrongIds = q.wrong.map(function (x) {
            return x.id;
          });
          var wrongWords = pool.filter(function (w) {
            return wrongIds.indexOf(w.id) !== -1;
          });
          q.questions = buildQuizQuestions(shuffle(wrongWords), q.mode);
          q.stage = 'active';
          q.index = 0;
          q.selected = null;
          q.score = 0;
          q.wrong = [];
          render();
        });
      }
      var retryAll = document.getElementById('retry-all');
      if (retryAll) {
        retryAll.addEventListener('click', function () {
          q.stage = 'setup';
          render();
        });
      }
      return;
    }

    var current = q.questions[q.index];
    var w = current.word;
    var hanziMode = q.mode === 'hanzi';
    var optionsHtml = current.options
      .map(function (opt) {
        var cls = 'option';
        if (opt === IDK_OPTION) cls += ' option-idk';
        else if (hanziMode) cls += ' option-hanzi hanzi';
        if (q.selected !== null) {
          if (opt === current.answer) cls += ' correct';
          else if (opt === q.selected) cls += ' wrong';
        }
        return '<button class="' + cls + '" data-opt="' + esc(opt) + '" ' + (q.selected !== null ? 'disabled' : '') + '>' + esc(opt) + '</button>';
      })
      .join('');

    panel.innerHTML =
      '<p class="meta">' +
      (q.index + 1) +
      ' / ' +
      q.questions.length +
      ' · ' +
      masteredHint(pool, modeMastered(q.mode)) +
      '</p>' +
      (hanziMode
        ? '<p class="quiz-ko">' +
          levelBadge(w) +
          '</p>' +
          '<p class="quiz-meaning">' +
          esc(w.ko) +
          '</p>' +
          '<p class="quiz-pinyin">' +
          esc(w.pinyin) +
          '</p>'
        : '<p class="quiz-ko">' +
          esc(w.ko) +
          ' ' +
          levelBadge(w) +
          '</p>' +
          '<p class="quiz-hanzi hanzi">' +
          esc(w.hanzi) +
          '</p>') +
      '<div class="options">' +
      optionsHtml +
      '</div>' +
      (q.selected !== null ? '<button class="btn btn-primary full-width" id="quiz-next">다음</button>' : '');

    Array.prototype.forEach.call(panel.querySelectorAll('[data-opt]'), function (btn) {
      btn.addEventListener('click', function () {
        if (q.selected !== null) return;
        var opt = btn.getAttribute('data-opt');
        q.selected = opt;
        var isCorrect = opt === current.answer;
        if (isCorrect) q.score++;
        else q.wrong.push(w);
        recordResult(w.id, isCorrect);
        recordMode(q.mode, w.id, isCorrect);
        render();
        checkDayComplete();
      });
    });
    var next = document.getElementById('quiz-next');
    if (next) {
      next.addEventListener('click', function () {
        q.index++;
        q.selected = null;
        render();
      });
    }
  }

  // ---------------- 성조 맞추기 게임 ----------------
  function renderTone() {
    var panel = document.getElementById('panel');
    var pool = getPool();
    var t = state.tone;

    if (t.stage === 'setup') {
      renderCountSetup(
        panel,
        '뜻과 한자를 보고 병음의 성조를 맞히는 게임이에요. 음절마다 1~4성 또는 경성을 골라보세요. 2번 맞힌 단어는 외운 단어가 되어 더 이상 나오지 않아요.',
        pool,
        function (words) {
          t.stage = 'active';
          t.items = words;
          t.index = 0;
          t.answers = [];
          t.checked = false;
          t.score = 0;
          t.wrong = [];
          render();
        },
        modeMastered('tone')
      );
      return;
    }

    if (t.stage === 'active' && t.index >= t.items.length) {
      t.stage = 'done';
    }

    if (t.stage === 'done') {
      var wrongList = t.wrong
        .map(function (item) {
          return (
            '<li><b class="hanzi">' +
            esc(item.hanzi) +
            '</b> [' +
            esc(item.pinyin) +
            '] ' +
            esc(item.ko) +
            '</li>'
          );
        })
        .join('');
      panel.innerHTML =
        '<div class="score">' +
        t.score +
        ' / ' +
        t.items.length +
        '</div>' +
        '<p class="meta">' +
        masteredHint(pool, modeMastered('tone')) +
        '</p>' +
        (t.wrong.length > 0
          ? '<div class="wrong-list"><h3>틀린 단어</h3><ul>' + wrongList + '</ul></div>'
          : '<p class="hint" style="text-align:center">🎉 성조를 전부 맞혔어요!</p>') +
        '<div class="setup-row">' +
        (t.wrong.length > 0 ? '<button class="btn btn-bad" id="tone-retry-wrong">틀린 것만 다시</button>' : '') +
        '<button class="btn btn-primary" id="tone-retry-all">새 문제 풀기</button>' +
        '</div>';
      var retryWrong = document.getElementById('tone-retry-wrong');
      if (retryWrong) {
        retryWrong.addEventListener('click', function () {
          t.items = shuffle(t.wrong);
          t.stage = 'active';
          t.index = 0;
          t.answers = [];
          t.checked = false;
          t.score = 0;
          t.wrong = [];
          render();
        });
      }
      var retryAll = document.getElementById('tone-retry-all');
      if (retryAll) {
        retryAll.addEventListener('click', function () {
          t.stage = 'setup';
          render();
        });
      }
      return;
    }

    var w = t.items[t.index];
    var sylls = wordSyllables(w);
    if (t.answers.length !== sylls.length) {
      t.answers = sylls.map(function () {
        return null;
      });
    }

    var allSelected = t.answers.every(function (a) {
      return a !== null;
    });

    var syllHtml = sylls
      .map(function (s, i) {
        var isCorrect = t.checked ? t.answers[i] === s.tone : null;
        var blockCls = 'tone-syllable' + (t.checked ? (isCorrect ? ' correct' : ' wrong') : '');
        var toneBtns = [1, 2, 3, 4, 5]
          .map(function (tn) {
            var cls = 'tone-btn' + (t.answers[i] === tn ? ' selected' : '');
            return (
              '<button class="' +
              cls +
              '" data-syll="' +
              i +
              '" data-tone="' +
              tn +
              '" ' +
              (t.checked ? 'disabled' : '') +
              '>' +
              tn +
              '</button>'
            );
          })
          .join('');
        var resultCls = 'tone-syllable-result' + (t.checked ? (isCorrect ? ' correct' : ' wrong') : '');
        var resultText = t.checked ? (isCorrect ? '✓ ' + TONE_LABELS[s.tone] : '✗ 정답 ' + TONE_LABELS[s.tone]) : '';
        return (
          '<div class="' +
          blockCls +
          '">' +
          '<div class="tone-syllable-char hanzi">' +
          esc(s.char) +
          '</div>' +
          '<div class="tone-syllable-plain">' +
          esc(s.plain) +
          '</div>' +
          '<div class="tone-btns">' +
          toneBtns +
          '</div>' +
          '<div class="' +
          resultCls +
          '">' +
          resultText +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    panel.innerHTML =
      '<p class="meta">' +
      (t.index + 1) +
      ' / ' +
      t.items.length +
      ' · ' +
      masteredHint(pool, modeMastered('tone')) +
      '</p>' +
      '<p class="quiz-ko">' +
      esc(w.ko) +
      ' ' +
      levelBadge(w) +
      '</p>' +
      '<div class="tone-legend">1성 ˉ · 2성 ˊ · 3성 ˇ · 4성 ˋ · 경성 ·</div>' +
      '<div class="tone-syllables">' +
      syllHtml +
      '</div>' +
      (t.checked
        ? '<div class="build-result tone-answer ' +
          (t.lastCorrect ? 'good' : 'bad') +
          '"><p class="build-verdict">' +
          (t.lastCorrect ? '정답! 🎉' : '정답은') +
          '</p><p class="tone-answer-hanzi hanzi">' +
          esc(w.hanzi) +
          '</p><p class="tone-answer-pinyin">' +
          esc(w.pinyin) +
          '</p><p class="hint" style="margin:4px 0 0">' +
          esc(w.ko) +
          '</p></div>' +
          '<button class="btn btn-primary full-width" id="tone-next">다음</button>'
        : '<button class="btn btn-primary full-width" id="tone-check" ' +
          (allSelected ? '' : 'disabled') +
          '>확인</button>');

    Array.prototype.forEach.call(panel.querySelectorAll('[data-syll]'), function (btn) {
      btn.addEventListener('click', function () {
        if (t.checked) return;
        var si = parseInt(btn.getAttribute('data-syll'), 10);
        var tn = parseInt(btn.getAttribute('data-tone'), 10);
        t.answers[si] = tn;
        render();
      });
    });
    var check = document.getElementById('tone-check');
    if (check) {
      check.addEventListener('click', function () {
        var allCorrect = sylls.every(function (s, i) {
          return t.answers[i] === s.tone;
        });
        t.checked = true;
        t.lastCorrect = allCorrect;
        if (allCorrect) t.score++;
        else t.wrong.push(w);
        recordResult(w.id, allCorrect);
        recordMode('tone', w.id, allCorrect);
        render();
        checkDayComplete();
      });
    }
    var next = document.getElementById('tone-next');
    if (next) {
      next.addEventListener('click', function () {
        t.index++;
        t.answers = [];
        t.checked = false;
        render();
      });
    }
  }

  // ---------------- 단어장 ----------------
  function renderWords() {
    var panel = document.getElementById('panel');
    var pool = getPool();
    var filtered = pool.filter(function (w) {
      var matchQuery =
        !state.wordQuery ||
        w.hanzi.indexOf(state.wordQuery) !== -1 ||
        w.pinyin.toLowerCase().indexOf(state.wordQuery.toLowerCase()) !== -1 ||
        w.ko.indexOf(state.wordQuery) !== -1;
      var matchStatus = state.wordStatus === 'all' || getEntry(w.id).status === state.wordStatus;
      return matchQuery && matchStatus;
    });

    var rows = filtered
      .map(function (w) {
        var st = getEntry(w.id).status;
        return (
          '<li class="wrow">' +
          '<div class="wmain"><b class="hanzi">' +
          esc(w.hanzi) +
          '</b><span class="wlevel">' +
          esc(w.pinyin) +
          '</span></div>' +
          '<div class="wko">' +
          esc(w.ko) +
          '</div>' +
          levelBadge(w) +
          '<span class="badge ' +
          st +
          '">' +
          (st === 'new' ? '신규' : st === 'known' ? '암기완료' : '학습중') +
          '</span>' +
          '</li>'
        );
      })
      .join('');

    var resetBlock = state.confirmingReset
      ? '<div class="reset-confirm">정말 전체 학습 기록을 초기화할까요?<div class="reset-confirm-actions">' +
        '<button class="btn btn-bad" id="reset-yes">초기화</button>' +
        '<button class="btn btn-ghost" id="reset-no">취소</button>' +
        '</div></div>'
      : '<button class="reset-btn" id="reset-progress">🗑️ 학습 진행 초기화</button>';

    panel.innerHTML =
      '<div class="controls-row">' +
      '<input class="search" id="word-search" placeholder="한자·병음·뜻 검색" value="' +
      esc(state.wordQuery) +
      '" />' +
      '<select class="select" id="word-status">' +
      '<option value="all">전체 상태</option>' +
      '<option value="new">신규</option>' +
      '<option value="learning">학습중</option>' +
      '<option value="known">암기완료</option>' +
      '</select>' +
      resetBlock +
      '</div>' +
      '<p class="meta">' +
      filtered.length +
      '개</p>' +
      '<ul class="wlist">' +
      (rows || '<li class="wrow">검색 결과가 없어요.</li>') +
      '</ul>';

    document.getElementById('word-search').addEventListener('input', function (e) {
      state.wordQuery = e.target.value;
      render();
    });
    var statusSel = document.getElementById('word-status');
    statusSel.value = state.wordStatus;
    statusSel.addEventListener('change', function (e) {
      state.wordStatus = e.target.value;
      render();
    });
    var resetBtn = document.getElementById('reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.confirmingReset = true;
        render();
      });
    }
    var yes = document.getElementById('reset-yes');
    if (yes) {
      yes.addEventListener('click', function () {
        resetProgress();
        state.confirmingReset = false;
        buildDeck();
        render();
      });
    }
    var no = document.getElementById('reset-no');
    if (no) {
      no.addEventListener('click', function () {
        state.confirmingReset = false;
        render();
      });
    }
  }

  // ---------------- 통계 ----------------
  function renderStats() {
    var panel = document.getElementById('panel');
    var total = WORDS.length;
    var known = 0,
      learning = 0,
      newCount = 0,
      correctSum = 0,
      wrongSum = 0;
    WORDS.forEach(function (w) {
      var e = getEntry(w.id);
      if (e.status === 'known') known++;
      else if (e.status === 'learning') learning++;
      else newCount++;
      correctSum += e.correct || 0;
      wrongSum += e.wrong || 0;
    });
    var attemptSum = correctSum + wrongSum;
    var acc = attemptSum > 0 ? Math.round((correctSum / attemptSum) * 100) : 0;
    var pct = total > 0 ? Math.round((known / total) * 100) : 0;

    var levelRows = '';
    [3, 4, 5].forEach(function (lvl) {
      var lvlWords = WORDS.filter(function (w) {
        return w.level === lvl;
      });
      var lvlKnown = lvlWords.filter(function (w) {
        return getEntry(w.id).status === 'known';
      }).length;
      var lvlPct = lvlWords.length > 0 ? Math.round((lvlKnown / lvlWords.length) * 100) : 0;
      levelRows +=
        '<div class="day-progress-row">' +
        '<span class="day-progress-label">HSK' +
        lvl +
        '</span>' +
        '<div class="pbar-o small"><div class="pbar-i" style="width:' +
        lvlPct +
        '%"></div></div>' +
        '<span class="day-progress-pct">' +
        lvlPct +
        '%</span>' +
        '</div>';
    });

    var dayRows = '';
    for (var d = 1; d <= TOTAL_DAYS; d++) {
      var dayWords = WORDS.filter(function (w) {
        return w.day === d;
      });
      if (dayWords.length === 0) continue;
      var dayKnown = dayWords.filter(function (w) {
        return getEntry(w.id).status === 'known';
      }).length;
      var dayPct = Math.round((dayKnown / dayWords.length) * 100);
      dayRows +=
        '<div class="day-progress-row">' +
        '<span class="day-progress-label">Day ' +
        d +
        '</span>' +
        '<div class="pbar-o small"><div class="pbar-i" style="width:' +
        dayPct +
        '%"></div></div>' +
        '<span class="day-progress-pct">' +
        dayPct +
        '%</span>' +
        '</div>';
    }

    panel.innerHTML =
      '<div class="stat-grid">' +
      '<div class="stat-card good"><div class="stat-num">' +
      known +
      '</div><div class="stat-lbl">암기완료</div></div>' +
      '<div class="stat-card bad"><div class="stat-num">' +
      learning +
      '</div><div class="stat-lbl">학습중</div></div>' +
      '<div class="stat-card"><div class="stat-num">' +
      newCount +
      '</div><div class="stat-lbl">신규</div></div>' +
      '<div class="stat-card"><div class="stat-num">' +
      acc +
      '%</div><div class="stat-lbl">퀴즈·성조게임 정답률</div></div>' +
      '</div>' +
      '<p class="meta" style="margin-bottom:4px">전체 암기 완료율 ' +
      pct +
      '% (' +
      known +
      ' / ' +
      total +
      ')</p>' +
      '<div class="pbar-o"><div class="pbar-i" style="width:' +
      pct +
      '%"></div></div>' +
      '<div class="quiz-stat"><h3>급수별 암기 완료율</h3><div class="day-progress-list">' +
      levelRows +
      '</div></div>' +
      '<div class="quiz-stat"><h3>Day별 암기 완료율</h3><div class="day-progress-list">' +
      dayRows +
      '</div></div>' +
      backupHtml();
    bindBackup();
  }

  // ---------------- 기록 백업 / 불러오기 ----------------
  // 기록은 이 브라우저에만 저장돼요. 다른 브라우저·기기로 옮기거나, 지워질 때를 대비해 코드로 백업해요.
  function exportCode() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('zh-') === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return 'ZHV1:' + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  }
  // 붙여넣을 때 줄바꿈·공백·앞뒤 글자가 섞이거나 앞부분("ZHV1:")이 빠져도 읽을 수 있게 너그럽게 처리
  function importCode(code) {
    var text = String(code || '');
    if (text.indexOf('ENV1:') !== -1 && text.indexOf('ZHV1:') === -1) throw new Error('other');
    var at = text.indexOf('ZHV1:');
    var body = at !== -1 ? (text.slice(at + 5).match(/^[\sA-Za-z0-9+/=]*/) || [''])[0] : text;
    body = body.replace(/[^A-Za-z0-9+/=]/g, '').replace(/=+(?=[A-Za-z0-9+/])/g, '');
    var data;
    try {
      data = JSON.parse(decodeURIComponent(escape(atob(body))));
    } catch (e) {
      throw new Error('bad');
    }
    if (!data || typeof data !== 'object') throw new Error('bad');
    var n = 0;
    Object.keys(data).forEach(function (k) {
      if (k.indexOf('zh-') === 0 && typeof data[k] === 'string') {
        localStorage.setItem(k, data[k]);
        n++;
      }
    });
    if (n === 0) throw new Error('empty');
  }
  function backupHtml() {
    return (
      '<div class="quiz-stat backup-card"><h3>💾 기록 백업</h3>' +
      '<p class="hint">외운 기록은 지금 쓰는 브라우저에만 저장돼요. 다른 폰·브라우저로 옮기거나 기록이 지워질 때를 대비해 백업 코드를 저장해 두세요.</p>' +
      '<p class="backup-step">① 기록이 <b>있는</b> 브라우저에서</p>' +
      '<div class="setup-row"><button class="btn btn-primary" id="backup-copy">백업 코드 복사</button></div>' +
      '<textarea class="backup-text" id="backup-out" readonly placeholder="여기에 이 브라우저의 백업 코드가 나와요"></textarea>' +
      '<p class="hint" id="backup-copy-msg"></p>' +
      '<p class="backup-step">② 기록을 <b>옮길</b> 브라우저에서</p>' +
      '<textarea class="backup-text" id="backup-text" placeholder="복사한 백업 코드를 여기에 붙여넣으세요"></textarea>' +
      '<div class="setup-row"><button class="btn btn-ghost" id="backup-load">붙여넣은 코드 불러오기</button></div>' +
      '<p class="hint" id="backup-msg"></p></div>'
    );
  }
  function bindBackup() {
    var copyMsg = document.getElementById('backup-copy-msg');
    var msg = document.getElementById('backup-msg');
    var out = document.getElementById('backup-out');
    var ta = document.getElementById('backup-text');
    document.getElementById('backup-copy').addEventListener('click', function () {
      var code = exportCode();
      out.value = code;
      // 코드 전체가 한눈에 보이게 칸을 늘려요 (일부만 복사되는 것 방지)
      out.style.height = 'auto';
      out.style.height = out.scrollHeight + 4 + 'px';
      out.select();
      var fallback = function () {
        copyMsg.textContent = '위 코드를 길게 눌러 전체 선택 후 복사해 주세요.';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () {
          copyMsg.textContent = '✅ 복사했어요! 옮길 브라우저에서 이 사이트를 열고 ② 칸에 붙여넣으세요.';
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
        msg.textContent =
          e.message === 'other'
            ? '⚠️ 토익 영단어 암기장의 백업 코드예요. 토익 영단어 암기장 사이트의 통계 탭에서 불러와 주세요.'
            : e.message === 'empty'
            ? '⚠️ 이 코드에는 저장된 기록이 없어요. 기록이 있는 브라우저에서 다시 복사해 주세요.'
            : '⚠️ 코드를 읽지 못했어요. 복사한 코드 전체를 빠짐없이 붙여넣어 주세요.';
      }
    });
  }


  // 카카오톡·인스타 등 앱 안 브라우저나 시크릿 모드에서는 기록이 지워질 수 있어서 안내해요.
  function storageNotice() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) {}
    var ua = navigator.userAgent || '';
    var inApp = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\/|DaumApps|everytimeApp/i.test(ua);
    var ok = true;
    try {
      localStorage.setItem('zh-test', '1');
      localStorage.removeItem('zh-test');
    } catch (e) {
      ok = false;
    }
    if (!inApp && ok) return;
    var el = document.createElement('div');
    el.className = 'storage-notice';
    el.textContent = !ok
      ? '⚠️ 이 브라우저(시크릿 모드 등)에서는 외운 기록이 저장되지 않아요. 일반 모드의 사파리·크롬으로 열어 주세요.'
      : '⚠️ 앱 안 브라우저에서는 외운 기록이 지워질 수 있어요. 오른쪽 위 메뉴에서 "다른 브라우저로 열기"(사파리·크롬)로 열어 주세요.';
    var wrap = document.querySelector('.wrap');
    wrap.insertBefore(el, wrap.firstChild.nextSibling);
  }


  // ---------------- 한자 조립 게임 (이야기 읽고 조각 맞추기) ----------------
  // (함수 선언은 호이스팅되지만 var 값은 아니라서 키를 함수 안에 둬요 — state 초기화 때 호출됨)
  function buildKey() {
    return 'zh-hanzi-build-v1';
  }
  function loadBuildProgress() {
    try {
      var raw = localStorage.getItem(buildKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveBuildProgress() {
    try {
      localStorage.setItem(buildKey(), JSON.stringify(state.buildProgress));
    } catch (e) {}
  }
  function isBuildMastered(h) {
    var e = state.buildProgress[h.ch];
    return !!e && e.status === 'known';
  }
  isBuildMastered.partial = function (h) {
    var e = state.buildProgress[h.ch];
    return !!e && e.status === 'learning' && (e.correct || 0) > 0;
  };
  function recordBuild(h, isCorrect) {
    var e = state.buildProgress[h.ch] || { correct: 0, wrong: 0, status: 'new' };
    var correct = (e.correct || 0) + (isCorrect ? 1 : 0);
    var known = isCorrect && (e.status === 'known' || correct >= MASTERED_THRESHOLD);
    state.buildProgress[h.ch] = {
      correct: correct,
      wrong: (e.wrong || 0) + (isCorrect ? 0 : 1),
      status: known ? 'known' : 'learning',
    };
    saveBuildProgress();
  }
  function partLabel(c) {
    return HANZI_COMPONENTS[c] || HANZI_AUTO_COMPONENTS[c] || '';
  }
  var ALL_COMPONENTS = Object.keys(HANZI_COMPONENTS).concat(
    Object.keys(HANZI_AUTO_COMPONENTS).filter(function (c) {
      return !HANZI_COMPONENTS[c];
    })
  );
  // 이야기가 있는 직접 만든 한자 + 단어장에 나오는 한자를 자동으로 나눈 것. 각 한자에 그 한자가 들어간 단어 목록을 붙여요.
  var ALL_HANZI = (function () {
    var byChar = {};
    WORDS.forEach(function (w) {
      w.hanzi.split('').forEach(function (c) {
        (byChar[c] = byChar[c] || []).push(w);
      });
    });
    var list = HANZI_PARTS.map(function (h) {
      return { ch: h.ch, parts: h.parts, py: h.py, ko: h.ko, story: h.story, words: byChar[h.ch] || [] };
    });
    HANZI_AUTO.forEach(function (s) {
      var chars = Array.from(s);
      var words = byChar[chars[0]] || [];
      list.push({ ch: chars[0], parts: chars.slice(1), py: charPinyin(words[0], chars[0]), ko: '', story: '', words: words });
    });
    return list;
  })();
  function charPinyin(w, ch) {
    if (!w) return '';
    var sylls = splitPinyin(w.pinyin);
    return sylls[w.hanzi.indexOf(ch)] || '';
  }
  // 학습 범위(Day)에 나오는 한자만. 전체일 때는 모든 한자.
  function getBuildPool() {
    if (state.day === 'all') return ALL_HANZI;
    var inScope = {};
    getPool().forEach(function (w) {
      w.hanzi.split('').forEach(function (c) {
        inScope[c] = true;
      });
    });
    return ALL_HANZI.filter(function (h) {
      return inScope[h.ch];
    });
  }
  // 문제에 보여줄 단어: 지금 학습 범위의 단어를 우선으로 골라요.
  function pickContextWord(h) {
    var scoped = getPool();
    var inScope = h.words.filter(function (w) {
      return scoped.indexOf(w) !== -1;
    });
    var from = inScope.length ? inScope : h.words;
    return from.length ? from[Math.floor(Math.random() * from.length)] : null;
  }
  function blankedWordHtml(w, ch) {
    return w.hanzi
      .split('')
      .map(function (c) {
        return c === ch ? '<span class="build-blank">□</span>' : esc(c);
      })
      .join('');
  }
  function storyHtml(story) {
    return esc(story).replace(/【(.*?)】/g, '<mark class="story-key">$1</mark>');
  }
  function equationHtml(h) {
    return (
      '<span class="build-eq">' +
      h.parts
        .map(function (c) {
          return '<span class="hanzi">' + esc(c) + '</span><small>' + esc(partLabel(c)) + '</small>';
        })
        .join('<i>+</i>') +
      '<i>=</i><b class="hanzi">' +
      esc(h.ch) +
      '</b></span>'
    );
  }
  // 정답 조각 + 헷갈리지 않는 오답 조각(뜻이 겹치지 않는 것) 섞기, 총 6~7장
  function buildTiles(h) {
    var labels = h.parts.map(partLabel);
    var others = shuffle(
      ALL_COMPONENTS.filter(function (c) {
        return h.parts.indexOf(c) === -1 && labels.indexOf(partLabel(c)) === -1;
      })
    );
    var picked = [];
    var usedLabels = labels.slice();
    for (var i = 0; i < others.length && picked.length < Math.max(4, 6 - h.parts.length); i++) {
      if (usedLabels.indexOf(partLabel(others[i])) !== -1) continue;
      usedLabels.push(partLabel(others[i]));
      picked.push(others[i]);
    }
    return shuffle(h.parts.concat(picked));
  }
  function startBuild(items) {
    var b = state.build;
    b.stage = 'active';
    b.items = items;
    b.index = 0;
    b.score = 0;
    b.wrong = [];
    prepareBuildItem();
    render();
  }
  function prepareBuildItem() {
    var b = state.build;
    b.picked = [];
    b.checked = false;
    b.lastCorrect = null;
    if (b.index < b.items.length) {
      b.tiles = buildTiles(b.items[b.index]);
      b.word = pickContextWord(b.items[b.index]);
    }
  }

  function renderBuild() {
    var panel = document.getElementById('panel');
    var b = state.build;
    var all = getBuildPool();

    if (b.stage === 'dex') {
      var stories = ALL_HANZI.filter(function (h) {
        return h.story;
      });
      panel.innerHTML =
        '<h2>📖 한자 이야기 도감</h2>' +
        '<p class="meta">이야기가 있는 한자 ' +
        stories.length +
        '자 · 눌러서 이야기 보기</p>' +
        '<div class="dex-grid">' +
        stories
          .map(function (h) {
            return (
              '<details class="dex-item' +
              (isBuildMastered(h) ? ' known' : '') +
              '"><summary><span class="hanzi">' +
              esc(h.ch) +
              '</span><small>' +
              esc(h.ko) +
              '</small></summary><div class="dex-body">' +
              equationHtml(h) +
              '<p class="build-py">' +
              esc(h.py) +
              '</p><p class="build-story">' +
              storyHtml(h.story) +
              '</p></div></details>'
            );
          })
          .join('') +
        '</div>' +
        '<button class="btn btn-primary full-width" id="dex-back">게임으로 돌아가기</button>';
      document.getElementById('dex-back').addEventListener('click', function () {
        b.stage = 'setup';
        render();
      });
      return;
    }

    if (b.stage === 'setup') {
      renderCountSetup(
        panel,
        '뜻을 보고 부수를 골라 한자를 맞혀요.' + (state.day === 'all' ? '' : ' (이 Day의 단어에 나오는 한자)'),
        all,
        startBuild,
        isBuildMastered,
        '한자',
        '<button class="btn btn-ghost full-width" id="open-dex">📖 한자 이야기 도감 보기</button>'
      );
      document.getElementById('open-dex').addEventListener('click', function () {
        b.stage = 'dex';
        render();
      });
      return;
    }

    if (b.stage === 'active' && b.index >= b.items.length) b.stage = 'done';

    if (b.stage === 'done') {
      panel.innerHTML =
        '<div class="score">' +
        b.score +
        ' / ' +
        b.items.length +
        '</div>' +
        '<p class="meta">' +
        masteredHint(all, isBuildMastered, '한자') +
        '</p>' +
        (b.wrong.length > 0
          ? '<div class="wrong-list"><h3>틀린 한자</h3><ul>' +
            b.wrong
              .map(function (h) {
                return '<li>' + equationHtml(h) + ' ' + esc(h.ko || (h.words[0] ? h.words[0].hanzi + ' ' + h.words[0].ko : '')) + '</li>';
              })
              .join('') +
            '</ul></div>'
          : '<p class="hint" style="text-align:center">🎉 전부 맞혔어요!</p>') +
        '<div class="setup-row">' +
        (b.wrong.length > 0 ? '<button class="btn btn-bad" id="build-retry-wrong">틀린 것만 다시</button>' : '') +
        '<button class="btn btn-primary" id="build-new">새 문제 풀기</button>' +
        '</div>';
      var rw = document.getElementById('build-retry-wrong');
      if (rw)
        rw.addEventListener('click', function () {
          startBuild(shuffle(b.wrong));
        });
      document.getElementById('build-new').addEventListener('click', function () {
        b.stage = 'setup';
        render();
      });
      return;
    }

    var h = b.items[b.index];
    var w = b.word;
    var py = w ? charPinyin(w, h.ch) || h.py : h.py;
    var slotsHtml = h.parts
      .map(function (_, i) {
        var ti = b.picked[i];
        var filled = ti !== undefined;
        return (
          '<button class="build-slot' +
          (filled ? ' filled' : '') +
          '" data-slot="' +
          i +
          '"' +
          (b.checked || !filled ? ' disabled' : '') +
          '>' +
          (filled ? '<span class="hanzi">' + esc(b.tiles[ti]) + '</span>' : '?') +
          '</button>'
        );
      })
      .join('<span class="build-plus">+</span>');
    var tilesHtml = b.tiles
      .map(function (c, i) {
        var used = b.picked.indexOf(i) !== -1;
        return (
          '<button class="build-tile' +
          (used ? ' used' : '') +
          '" data-tile="' +
          i +
          '"' +
          (used || b.checked ? ' disabled' : '') +
          '><span class="hanzi">' +
          esc(c) +
          '</span><small>' +
          esc(partLabel(c)) +
          '</small></button>'
        );
      })
      .join('');
    var full = b.picked.length === h.parts.length;
    var resultHtml = '';
    if (b.checked) {
      resultHtml =
        '<div class="build-result ' +
        (b.lastCorrect ? 'good' : 'bad') +
        '"><p class="build-verdict">' +
        (b.lastCorrect ? '정답! 🎉' : '아쉬워요. 정답은') +
        '</p>' +
        equationHtml(h) +
        '<p class="build-py">' +
        esc(py) +
        (h.ko ? ' · ' + esc(h.ko) : '') +
        '</p>' +
        (w ? '<p class="build-word-full"><b class="hanzi">' + esc(w.hanzi) + '</b> ' + esc(w.pinyin) + ' · ' + esc(w.ko) + '</p>' : '') +
        '</div>' +
        '<button class="btn btn-primary full-width" id="build-next">다음</button>';
    } else {
      resultHtml =
        '<div class="setup-row">' +
        '<button class="btn btn-ghost" id="build-idk">모르겠어요</button>' +
        '<button class="btn btn-primary" id="build-check"' +
        (full ? '' : ' disabled') +
        '>확인</button></div>';
    }

    panel.innerHTML =
      '<p class="meta">' +
      (b.index + 1) +
      ' / ' +
      b.items.length +
      ' · ' +
      masteredHint(all, isBuildMastered, '한자') +
      '</p>' +
      (w
        ? '<p class="build-word hanzi">' +
          (b.checked ? esc(w.hanzi) : blankedWordHtml(w, h.ch)) +
          '</p>' +
          '<p class="build-prompt">' +
          (h.ko ? esc(h.ko) + ' · ' : '') +
          '<span class="build-py-inline">' +
          esc(py) +
          '</span></p>' +
          '<p class="build-word-meaning">' +
          esc(w.pinyin) +
          ' · ' +
          esc(w.ko) +
          '</p>'
        : '<p class="build-prompt">' + esc(h.ko) + ' <span class="build-py-inline">' + esc(py) + '</span></p>') +
      '<div class="build-slots">' +
      slotsHtml +
      '<span class="build-plus">=</span><span class="build-target hanzi">' +
      (b.checked ? esc(h.ch) : '?') +
      '</span></div>' +
      '<div class="build-tiles">' +
      tilesHtml +
      '</div>' +
      resultHtml;

    Array.prototype.forEach.call(panel.querySelectorAll('[data-tile]'), function (btn) {
      btn.addEventListener('click', function () {
        if (b.checked || b.picked.length >= h.parts.length) return;
        b.picked.push(parseInt(btn.getAttribute('data-tile'), 10));
        render();
      });
    });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-slot]'), function (btn) {
      btn.addEventListener('click', function () {
        if (b.checked) return;
        b.picked.splice(parseInt(btn.getAttribute('data-slot'), 10), 1);
        render();
      });
    });
    function finish(isCorrect) {
      b.checked = true;
      b.lastCorrect = isCorrect;
      if (isCorrect) b.score++;
      else b.wrong.push(h);
      recordBuild(h, isCorrect);
      render();
      checkDayComplete();
    }
    var check = document.getElementById('build-check');
    if (check)
      check.addEventListener('click', function () {
        var chosen = b.picked
          .map(function (i) {
            return b.tiles[i];
          })
          .sort()
          .join('');
        finish(chosen === h.parts.slice().sort().join(''));
      });
    var idk = document.getElementById('build-idk');
    if (idk)
      idk.addEventListener('click', function () {
        finish(false);
      });
    var next = document.getElementById('build-next');
    if (next)
      next.addEventListener('click', function () {
        b.index++;
        prepareBuildItem();
        render();
      });
  }

  var PRAISES = [
    '꾸준함이 실력을 만들어요. 오늘도 해냈어요!',
    '오늘의 당신, 정말 멋져요! 👏',
    '한 걸음 한 걸음이 모여 유창함이 돼요. 최고예요!',
    '와, 네 구역을 전부 정복했어요! 대단해요!',
    '오늘 외운 단어들이 내일의 자신감이 될 거예요.',
    '이 정도면 중국어 천재 아닌가요? 🌟',
    '포기하지 않고 끝까지! 그게 제일 어려운 건데 해냈어요.',
    '加油！오늘도 정말 잘했어요! 💪',
    '머릿속에 단어 30개가 새로 이사 왔어요. 축하해요!',
    '성실함은 배신하지 않아요. 오늘도 멋지게 완주!',
    '太棒了！(tài bàng le) 정말 최고예요!',
    '오늘의 노력, 분명히 기억에 오래 남을 거예요.',
    '병음, 한자, 성조, 조립까지 완벽! 빈틈이 없네요.',
    '매일 이렇게만 하면 HSK도 문제없어요! 📚',
    '스스로를 칭찬해 주세요. 오늘 진짜 잘했어요!',
    '你真厉害！(nǐ zhēn lìhai) 정말 대단해요!',
    '작은 성취가 쌓여 큰 변화를 만들어요. 오늘도 한 칸 전진!',
    '오늘의 목표 달성! 맛있는 거 먹을 자격 충분해요 🍜',
    '공부하는 모습이 정말 빛나요 ✨',
    '완벽한 하루! 이 기세 그대로 내일도 가 봐요.',
    '어려운 성조까지 해냈다니, 귀가 점점 트이고 있어요!',
    '한자 조립 장인 등극! 🧩',
    '오늘 하루도 나 자신과의 약속을 지켰어요. 멋져요!',
    '学而时习之 — 배우고 때때로 익히니 기쁘지 아니한가! 오늘 딱 그랬어요.',
    '벌써 이만큼 왔어요. 처음보다 훨씬 성장했어요!',
    '이 단어들, 이제 완전히 당신 거예요. 🎁',
    '꾸준히 하는 사람이 결국 이겨요. 오늘도 승리!',
    '非常好！(fēicháng hǎo) 아주 훌륭해요!',
    '오늘 공부 끝! 뿌듯함을 마음껏 즐기세요 😊',
    '대단한 집중력이었어요. 박수 짝짝짝! 👏👏👏',
    '중국 여행 가면 오늘 외운 단어가 분명 도와줄 거예요 ✈️'
  ];

  // 날짜마다 다른 칭찬 (같은 날엔 같은 문구)
  function todaysPraise() {
    var d = new Date();
    var dayNum = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
    return PRAISES[((dayNum % PRAISES.length) + PRAISES.length) % PRAISES.length];
  }
  // 지금 학습 범위(Day)의 네 구역 진행 상황
  function dayStatus() {
    var words = getPool();
    var hz = getBuildPool();
    var sections = [
      { key: 'pinyin', done: words.filter(modeMastered('pinyin')).length, total: words.length },
      { key: 'hanzi', done: words.filter(modeMastered('hanzi')).length, total: words.length },
      { key: 'tone', done: words.filter(modeMastered('tone')).length, total: words.length },
      { key: 'build', done: hz.filter(isBuildMastered).length, total: hz.length },
    ];
    var complete = sections.every(function (x) {
      return x.done >= x.total;
    });
    return { sections: sections, complete: complete };
  }
  function loadDoneDays() {
    try {
      return JSON.parse(localStorage.getItem('zh-vocab-day-done-v1') || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function dayProgressHtml() {
    if (state.day === 'all') return '';
    var st = dayStatus();
    var done = loadDoneDays()[state.day];
    return (
      '<div class="day-progress-card' +
      (st.complete ? ' complete' : '') +
      '"><p class="day-progress-title">' +
      (st.complete ? '🏆 Day ' + state.day + ' 오늘의 단어 완성!' : '🎯 Day ' + state.day + ' 오늘의 단어 — 네 구역을 모두 외우면 완성') +
      '</p><div class="day-progress-grid">' +
      st.sections
        .map(function (x) {
          return (
            '<span class="' +
            (x.done >= x.total ? 'ok' : '') +
            '">' +
            SECTION_NAMES[x.key] +
            ' <b>' +
            x.done +
            '/' +
            x.total +
            '</b></span>'
          );
        })
        .join('') +
      '</div>' +
      (st.complete && done ? '<p class="hint" style="margin:6px 0 0">' + esc(done) + ' 완성</p>' : '') +
      '</div>'
    );
  }
  // 답을 기록한 뒤: 이번에 처음으로 네 구역을 다 외웠으면 축하 화면
  function checkDayComplete() {
    if (state.day === 'all') return;
    var doneDays = loadDoneDays();
    if (doneDays[state.day]) return;
    var st = dayStatus();
    if (!st.complete) return;
    var d = new Date();
    doneDays[state.day] = d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
    try {
      localStorage.setItem('zh-vocab-day-done-v1', JSON.stringify(doneDays));
    } catch (e) {}
    showCelebration(st);
  }
  function showCelebration(st) {
    var el = document.createElement('div');
    el.className = 'celebrate';
    el.innerHTML =
      '<div class="celebrate-card" role="dialog" aria-modal="true">' +
      '<div class="celebrate-emoji">🎉</div>' +
      '<h2>Day ' +
      state.day +
      ' 오늘의 단어 완성!</h2>' +
      '<p class="celebrate-praise">' +
      esc(todaysPraise()) +
      '</p>' +
      '<div class="day-progress-grid">' +
      st.sections
        .map(function (x) {
          return '<span class="ok">' + SECTION_NAMES[x.key] + ' <b>' + x.done + '/' + x.total + '</b></span>';
        })
        .join('') +
      '</div>' +
      '<button class="btn btn-primary full-width" id="celebrate-close">고마워요! 😊</button>' +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('celebrate-close').addEventListener('click', function () {
      el.remove();
      render();
    });
  }

  function render() {
    renderDaySelect();
    renderTabs();
    if (state.tab === 'cards') renderCards();
    else if (state.tab === 'quiz') renderQuiz();
    else if (state.tab === 'tone') renderTone();
    else if (state.tab === 'build') renderBuild();
    else if (state.tab === 'words') renderWords();
    else if (state.tab === 'stats') renderStats();
  }

  storageNotice();
  render();
})();
