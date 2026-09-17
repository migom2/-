(function () {
  var STORAGE_KEY = 'vocab-progress-v1';

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
  function recordQuiz(id, isCorrect) {
    var entry = state.progress[id] || { status: 'new', correct: 0, wrong: 0 };
    state.progress[id] = {
      correct: (entry.correct || 0) + (isCorrect ? 1 : 0),
      wrong: (entry.wrong || 0) + (isCorrect ? 0 : 1),
      status: isCorrect ? 'known' : 'learning',
    };
    saveProgress();
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
    tab: 'cards',
    progress: loadProgress(),
    cardFilter: 'all',
    cardDeck: [],
    cardIndex: 0,
    cardFlipped: false,
    quiz: { stage: 'setup', questions: [], index: 0, selected: null, score: 0, wrong: [] },
    wordQuery: '',
    wordStatus: 'all',
  };

  function buildDeck() {
    var pool =
      state.cardFilter === 'all'
        ? WORDS
        : WORDS.filter(function (w) {
            return getEntry(w.id).status === state.cardFilter;
          });
    state.cardDeck = shuffle(pool);
    state.cardIndex = 0;
    state.cardFlipped = false;
  }
  buildDeck();

  var TABS = [
    { key: 'cards', label: '📇 플래시카드' },
    { key: 'quiz', label: '📝 퀴즈' },
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
        if (state.tab === 'quiz') {
          state.quiz = { stage: 'setup', questions: [], index: 0, selected: null, score: 0, wrong: [] };
        }
        render();
      });
    });
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
        '<button class="btn btn-primary" id="restart-deck" style="flex:none;padding:12px 20px;">다시 섞어서 학습하기</button></div>';
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
        '<span class="level-badge">TOEIC ' +
        esc(w.level) +
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
        esc(w.example) +
        '</p>' +
        '</div>' +
        '</div>' +
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
  }

  function buildQuestions(count) {
    var chosen = shuffle(WORDS).slice(0, count);
    return chosen.map(function (word) {
      var distractors = shuffle(
        WORDS.filter(function (w) {
          return w.id !== word.id;
        }),
      )
        .slice(0, 3)
        .map(function (w) {
          return w.ko;
        });
      return { word: word, options: shuffle([word.ko].concat(distractors)) };
    });
  }

  function renderQuiz() {
    var panel = document.getElementById('panel');
    var q = state.quiz;

    if (q.stage === 'setup') {
      panel.innerHTML =
        '<h2>퀴즈 시작하기</h2>' +
        '<p class="hint" style="margin-bottom:16px;">몇 문제를 풀어볼까요?</p>' +
        '<div class="setup-row">' +
        '<button class="btn btn-primary" data-count="10">10문제</button>' +
        '<button class="btn btn-primary" data-count="20">20문제</button>' +
        '<button class="btn btn-primary" data-count="' +
        WORDS.length +
        '">전체</button>' +
        '</div>';
      Array.prototype.forEach.call(panel.querySelectorAll('[data-count]'), function (btn) {
        btn.addEventListener('click', function () {
          var count = parseInt(btn.getAttribute('data-count'), 10);
          state.quiz = { stage: 'playing', questions: buildQuestions(count), index: 0, selected: null, score: 0, wrong: [] };
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
        '<button class="btn btn-primary" id="retry-quiz">다시 풀기</button>';
      document.getElementById('retry-quiz').addEventListener('click', function () {
        state.quiz = { stage: 'setup', questions: [], index: 0, selected: null, score: 0, wrong: [] };
        render();
      });
      return;
    }

    var current = q.questions[q.index];
    var isLast = q.index === q.questions.length - 1;
    var optsHtml = current.options
      .map(function (opt) {
        var cls = 'option';
        if (q.selected) {
          if (opt === current.word.ko) cls += ' correct';
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
      '<h2 class="quiz-word">' +
      esc(current.word.en) +
      '</h2>' +
      '<p class="hint" style="text-align:center;">알맞은 뜻을 고르세요</p>' +
      '<div class="options">' +
      optsHtml +
      '</div>' +
      (q.selected ? '<button class="btn btn-primary" id="next-q">' + (isLast ? '결과 보기' : '다음 문제') + '</button>' : '');

    if (!q.selected) {
      Array.prototype.forEach.call(panel.querySelectorAll('[data-opt]'), function (btn) {
        btn.addEventListener('click', function () {
          var opt = btn.getAttribute('data-opt');
          var isCorrect = opt === current.word.ko;
          q.selected = opt;
          recordQuiz(current.word.id, isCorrect);
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

  var STATUS_LABEL = { new: '신규', learning: '학습중', known: '암기완료' };

  function renderWords() {
    var panel = document.getElementById('panel');
    var query = state.wordQuery.trim().toLowerCase();
    var filtered = WORDS.filter(function (w) {
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
            '</b><span class="wlevel">TOEIC ' +
            esc(w.level) +
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
      '<button class="reset-btn" id="reset-btn">진행 초기화</button>' +
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
    document.getElementById('reset-btn').addEventListener('click', function () {
      if (window.confirm('모든 학습 진행 상황을 초기화할까요?')) {
        resetProgress();
        buildDeck();
        render();
      }
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
        : '아직 퀴즈를 풀지 않았어요.';

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
      '<div class="quiz-stat"><h3>퀴즈 정답률</h3><p>' +
      accuracyText +
      '</p></div>';
  }

  function render() {
    renderTabs();
    if (state.tab === 'cards') renderCards();
    else if (state.tab === 'quiz') renderQuiz();
    else if (state.tab === 'words') renderWords();
    else if (state.tab === 'stats') renderStats();
  }

  render();
})();
