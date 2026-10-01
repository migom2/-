(() => {
  const STORE_KEY = 'toeic-translation-v1';
  const PLACEMENT_IDS = ['400-01', '600-01', '900-01'];
  const GRADE = {
    o: { label: '⭕ 완벽', short: '⭕', meter: 35 },
    p: { label: '🔺 비슷', short: '🔺', meter: 15 },
    x: { label: '❌ 틀림', short: '❌', meter: -30 },
  };
  const byId = Object.fromEntries(SENTENCES.map((s) => [s.id, s]));

  // ───── 저장 ─────
  function defaultState() {
    return {
      placed: false,
      levelIdx: 0,
      meter: 30,
      dir: 'en2ko',
      currentId: null,
      placement: null, // { step, grades: [] }
      history: {}, // id -> { grade, tries, last }
      days: {}, // 'YYYY-MM-DD' -> { words: [[en, ko]], items: [{ id, grade, answer }] }
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {}
    return defaultState();
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {}
  }
  let state = load();

  // 화면 상태 (저장하지 않음)
  let view = 'practice';
  let attempt = null; // { answer, revealed, check, suggested, graded, levelMsg }
  let wordsDate = null;

  const $panel = document.getElementById('panel');
  const $tabs = document.getElementById('tabs');

  // ───── 유틸 ─────
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function prettyDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
    return `${y}년 ${m}월 ${d}일 (${wd})`;
  }
  function norm(s) {
    return String(s).toLowerCase().replace(/[\s.,!?'"’‘“”~·()\-]/g, '');
  }
  function level() {
    return LEVELS[state.levelIdx];
  }

  // ───── 자동 체크 ─────
  // 영→한: 문장의 핵심 의미(한국어)가 답에 들어 있는지 확인
  // 한→영: 문장의 핵심 단어(영어)가 답에 들어 있는지 확인 (어미 변화는 앞부분만 비교)
  function checkKeys(sentence, answer, dir) {
    const a = norm(answer);
    if (dir === 'en2ko') {
      return sentence.keys.map((alts) => ({
        label: alts[0],
        ok: alts.some((k) => a.includes(norm(k))),
      }));
    }
    return sentence.words.map(([en]) => {
      const parts = en.toLowerCase().replace(/\(.*?\)/g, '').split(/[\s/]+/).filter((w) => w.length > 2 && !/^(the|and|for|than|that)$/.test(w));
      const stems = (parts.length ? parts : [en.toLowerCase()]).map((w) => {
        const cut = w.length > 5 ? w.length - 2 : w.length;
        return norm(w.slice(0, cut).normalize('NFD').replace(/[̀-ͯ]/g, ''));
      });
      const plain = a.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return { label: en, ok: stems.every((st) => plain.includes(st)) };
    });
  }
  function suggestGrade(check, answer) {
    if (!answer.trim()) return 'x';
    const ratio = check.filter((c) => c.ok).length / check.length;
    if (ratio >= 0.8) return 'o';
    if (ratio >= 0.5) return 'p';
    return 'x';
  }

  // ───── 문제 선택 ─────
  function pickNext() {
    const lv = level();
    const pool = SENTENCES.filter((s) => s.level === lv && s.id !== state.currentId);
    const fresh = pool.filter((s) => !state.history[s.id]);
    const review = pool.filter((s) => state.history[s.id] && state.history[s.id].grade !== 'o');
    let next;
    if (fresh.length) next = fresh[Math.floor(Math.random() * fresh.length)];
    else if (review.length) next = review[Math.floor(Math.random() * review.length)];
    else next = pool.slice().sort((a, b) => (state.history[a.id]?.last || 0) - (state.history[b.id]?.last || 0))[0];
    state.currentId = next ? next.id : SENTENCES.find((s) => s.level === lv).id;
    attempt = null;
    save();
  }
  function currentSentence() {
    if (state.placement) return byId[PLACEMENT_IDS[state.placement.step]];
    const stale = !state.currentId || !byId[state.currentId] || byId[state.currentId].level !== level();
    // 채점 직후 레벨이 바뀌어도 방금 푼 문장은 그대로 보여 준다
    if (stale && !(attempt && attempt.revealed)) pickNext();
    return byId[state.currentId];
  }
  function questionKind(s) {
    if (state.placement) return { cls: 'test', text: `레벨 테스트 ${state.placement.step + 1}/${PLACEMENT_IDS.length}` };
    const h = state.history[s.id];
    if (!h) return { cls: 'new', text: '새 문제' };
    if (h.grade !== 'o') return { cls: 'review', text: '복습 문제' };
    return { cls: 'again', text: '다시 풀기' };
  }

  // ───── 기록 ─────
  function logDay(s, grade, answer) {
    const key = todayKey();
    const day = state.days[key] || (state.days[key] = { words: [], items: [] });
    s.words.forEach(([en, ko]) => {
      const same = day.words.find((w) => w[0] === en);
      if (!same) day.words.push([en, ko]);
      else if (!same[1].includes(ko)) same[1] += `, ${ko}`; // 같은 단어의 다른 뜻은 합친다
    });
    day.items.push({ id: s.id, grade, answer, dir: state.dir });
  }
  function applyGrade(s, grade) {
    const prev = state.history[s.id];
    state.history[s.id] = { grade, tries: (prev ? prev.tries : 0) + 1, last: Date.now() };
    logDay(s, grade, attempt.answer);

    if (state.placement) {
      state.placement.grades.push(grade);
      attempt.graded = grade;
      save();
      return;
    }

    let msg = '';
    state.meter += GRADE[grade].meter;
    if (state.meter >= 100) {
      if (state.levelIdx < LEVELS.length - 1) {
        state.levelIdx += 1;
        state.meter = 30;
        msg = `🎉 레벨 업! 이제 TOEIC ${level()} 수준 문장이 나와요.`;
      } else {
        state.meter = 100;
        msg = '🏆 최고 레벨(900)을 유지하고 있어요!';
      }
    } else if (state.meter < 0) {
      if (state.levelIdx > 0) {
        state.levelIdx -= 1;
        state.meter = 60;
        msg = `📉 조금 어려웠죠? TOEIC ${level()} 수준에서 기초를 다져 볼게요.`;
      } else {
        state.meter = 0;
      }
    }
    attempt.graded = grade;
    attempt.levelMsg = msg;
    save();
  }
  function placementResult(g) {
    const [easy, mid, hard] = g;
    if (hard === 'o') return 4; // 800
    if (hard === 'p' && mid === 'o') return 3; // 700
    if (mid === 'o') return 2; // 600
    if (mid === 'p') return 1; // 500
    return easy === 'o' ? 1 : 0;
  }

  // ───── 렌더링 ─────
  function renderTabs() {
    const tabs = [
      ['practice', '✍️ 번역 연습'],
      ['words', '📒 오늘의 단어'],
      ['stats', '📊 내 기록'],
    ];
    $tabs.innerHTML = tabs.map(([k, t]) => `<button data-tab="${k}" class="${view === k ? 'active' : ''}">${t}</button>`).join('');
  }

  function render() {
    renderTabs();
    if (view === 'practice') renderPractice();
    else if (view === 'words') renderWords();
    else renderStats();
  }

  function renderIntro() {
    $panel.innerHTML = `
      <div class="intro">
        <h2>한 문장씩, 내 수준에 맞게</h2>
        <p>토익 400~900 수준의 비즈니스 문장을 번역하고, 정답과 함께 핵심 표현·단어 설명을 확인하세요. 실력에 맞춰 난이도가 자동으로 오르내립니다.</p>
        <ol class="steps">
          <li><b>레벨 테스트</b> — 3문장으로 시작 레벨을 정해요.</li>
          <li><b>번역 → 정답 확인</b> — 핵심 의미를 자동으로 체크하고, 스스로 채점해요.</li>
          <li><b>레벨 게이지</b> — ⭕를 쌓으면 레벨 업, ❌가 쌓이면 한 단계 쉬운 문장으로.</li>
          <li><b>오늘의 단어</b> — 그날 나온 단어를 <code>영단어-뜻</code> 형태로 모아 복사해요.</li>
        </ol>
        <button class="btn primary block" data-act="start-test">레벨 테스트 시작</button>
        <div class="or">또는 레벨을 직접 고르기</div>
        <div class="chiprow center">
          ${LEVELS.map((l, i) => `<button class="chip" data-act="pick-level" data-idx="${i}">${l}</button>`).join('')}
        </div>
      </div>`;
  }

  function renderPlacementDone() {
    const g = state.placement.grades;
    const idx = placementResult(g);
    $panel.innerHTML = `
      <div class="intro">
        <h2>레벨 테스트 결과</h2>
        <div class="result-row">
          ${PLACEMENT_IDS.map((id, i) => `<div class="result-cell"><span>${byId[id].level}</span><b>${GRADE[g[i]].short}</b></div>`).join('')}
        </div>
        <p class="big-level">시작 레벨 <b>TOEIC ${LEVELS[idx]}</b></p>
        <p class="soft">문제를 풀수록 레벨이 자동으로 조정돼요. 너무 쉽거나 어려우면 아래에서 바꿀 수 있어요.</p>
        <button class="btn primary block" data-act="finish-test" data-idx="${idx}">TOEIC ${LEVELS[idx]}로 시작하기</button>
        <div class="chiprow center">
          ${LEVELS.map((l, i) => `<button class="chip ${i === idx ? 'active' : ''}" data-act="finish-test" data-idx="${i}">${l}</button>`).join('')}
        </div>
      </div>`;
  }

  function renderPractice() {
    if (!state.placed && !state.placement) return renderIntro();
    if (state.placement && state.placement.grades.length === PLACEMENT_IDS.length && !attempt) return renderPlacementDone();

    const s = currentSentence();
    const dir = state.placement ? 'en2ko' : state.dir;
    const src = dir === 'en2ko' ? s.en : s.ko;
    const model = dir === 'en2ko' ? s.ko : s.en;
    const kind = questionKind(s);
    const a = attempt;

    let head = '';
    if (state.placement) {
      head = `<div class="meta">레벨 테스트 · 사전 없이 아는 만큼만 써 보세요</div>`;
    } else {
      head = `
        <div class="levelbar">
          <div class="lv">TOEIC <b>${level()}</b></div>
          <div class="gauge" title="레벨 게이지"><i style="width:${Math.max(0, Math.min(100, state.meter))}%"></i></div>
          <div class="dir">
            <button class="seg ${state.dir === 'en2ko' ? 'on' : ''}" data-act="dir" data-dir="en2ko">영→한</button>
            <button class="seg ${state.dir === 'ko2en' ? 'on' : ''}" data-act="dir" data-dir="ko2en">한→영</button>
          </div>
        </div>`;
    }

    let body = `
      <div class="qcard">
        <div class="qtop"><span class="badge ${kind.cls}">${kind.text}</span><span class="qlv">${s.level}</span></div>
        <p class="src ${dir === 'en2ko' ? 'en' : 'ko'}">${esc(src)}</p>
      </div>`;

    if (!a || !a.revealed) {
      body += `
        <textarea id="answer" class="answer" rows="3" placeholder="${dir === 'en2ko' ? '한국어로 번역해 보세요' : 'Translate into English'}">${a ? esc(a.answer) : ''}</textarea>
        <div class="btnrow">
          <button class="btn ghost" data-act="giveup">모르겠어요</button>
          <button class="btn primary" data-act="reveal">정답 확인</button>
        </div>
        <p class="hint">⌘/Ctrl + Enter 로도 정답을 확인할 수 있어요.</p>`;
    } else {
      const okCount = a.check.filter((c) => c.ok).length;
      body += `
        <div class="compare">
          <div class="mine"><label>내 번역</label><p>${a.answer.trim() ? esc(a.answer) : '<span class="soft">(작성하지 않음)</span>'}</p></div>
          <div class="model"><label>모범 번역</label><p>${esc(model)}</p></div>
        </div>
        <div class="keycheck">
          <label>핵심 의미 체크 <span class="soft">${okCount}/${a.check.length}</span></label>
          <div class="keys">${a.check.map((c) => `<span class="key ${c.ok ? 'ok' : 'miss'}">${c.ok ? '✓' : '✗'} ${esc(c.label)}</span>`).join('')}</div>
          <p class="soft small">자동 체크는 참고용이에요. 표현이 달라도 뜻이 맞으면 스스로 ⭕를 주세요.</p>
        </div>
        <section class="explain">
          <h3>💡 핵심 표현</h3>
          ${s.exprs.map(([p, m, n]) => `<div class="expr"><div class="ex-head"><b>${esc(p)}</b><span>${esc(m)}</span></div><p>${esc(n)}</p></div>`).join('')}
          <h3>📚 단어</h3>
          <ul class="wordlist">${s.words.map(([en, ko]) => `<li><b>${esc(en)}</b><span>${esc(ko)}</span></li>`).join('')}</ul>
          ${dir === 'ko2en' ? `<p class="soft small">원문: ${esc(s.ko)}</p>` : `<p class="soft small">원문: ${esc(s.en)}</p>`}
        </section>`;

      if (!a.graded) {
        body += `
          <div class="grade">
            <label>내 번역은 어땠나요?</label>
            <div class="grade-btns">
              ${['o', 'p', 'x'].map((g) => `<button class="gbtn ${g} ${a.suggested === g ? 'suggested' : ''}" data-act="grade" data-g="${g}">${GRADE[g].label}${a.suggested === g ? '<small>추천</small>' : ''}</button>`).join('')}
            </div>
          </div>`;
      } else {
        const last = state.placement && state.placement.grades.length === PLACEMENT_IDS.length;
        body += `
          ${a.levelMsg ? `<div class="levelmsg">${esc(a.levelMsg)}</div>` : ''}
          <button class="btn primary block" data-act="next">${last ? '결과 보기 →' : '다음 문제 →'}</button>`;
      }
    }

    $panel.innerHTML = head + body;
    const ta = document.getElementById('answer');
    if (ta) {
      ta.addEventListener('input', () => {
        attempt = attempt || { answer: '' };
        attempt.answer = ta.value;
      });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          reveal();
        }
      });
    }
  }

  function reveal(giveUp) {
    const s = currentSentence();
    const dir = state.placement ? 'en2ko' : state.dir;
    const answer = giveUp ? '' : (document.getElementById('answer')?.value || '');
    const check = checkKeys(s, answer, dir);
    attempt = { answer, revealed: true, check, suggested: suggestGrade(check, answer), graded: null, levelMsg: '' };
    if (giveUp) {
      applyGrade(s, 'x');
    }
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderWords() {
    const dates = Object.keys(state.days).filter((k) => state.days[k].words.length).sort().reverse();
    const today = todayKey();
    if (!wordsDate || !state.days[wordsDate]) wordsDate = state.days[today] ? today : dates[0] || today;
    const day = state.days[wordsDate] || { words: [], items: [] };
    const text = day.words.map(([en, ko]) => `${en}-${ko}`).join('\n');
    const dateOpts = (dates.includes(today) ? dates : [today, ...dates]);

    $panel.innerHTML = `
      <div class="day-row">
        <label for="date-select">날짜</label>
        <select id="date-select" class="select">
          ${dateOpts.map((k) => `<option value="${k}" ${k === wordsDate ? 'selected' : ''}>${prettyDate(k)}${k === today ? ' · 오늘' : ''}</option>`).join('')}
        </select>
      </div>
      ${day.words.length ? `
        <div class="meta">${day.items.length}문제 · 단어 ${day.words.length}개</div>
        <textarea id="wordtext" class="wordtext" readonly rows="${Math.min(16, day.words.length + 1)}">${esc(text)}</textarea>
        <button class="btn primary block" data-act="copy">📋 단어장에 붙여넣기용 복사</button>
        <p class="hint" id="copy-msg">영단어-뜻 형태로 한 줄에 하나씩 복사돼요.</p>
        <h3 class="sub">이 날 푼 문장</h3>
        <ul class="daylist">
          ${day.items.map((it) => {
            const s = byId[it.id];
            if (!s) return '';
            return `<li><span class="mark">${GRADE[it.grade].short}</span><div><p class="en">${esc(s.en)}</p><p class="ko">${esc(s.ko)}</p>${it.answer ? `<p class="mine-ans">내 답: ${esc(it.answer)}</p>` : ''}</div></li>`;
          }).join('')}
        </ul>` : `
        <div class="empty">
          <p>아직 이 날 푼 문제가 없어요.</p>
          <p class="soft">번역 문제를 풀면 나온 단어가 여기에 자동으로 모여요.</p>
          <button class="btn primary" data-act="goto-practice">번역하러 가기</button>
        </div>`}
    `;
    document.getElementById('date-select').addEventListener('change', (e) => {
      wordsDate = e.target.value;
      renderWords();
    });
  }

  function renderStats() {
    const allItems = Object.values(state.days).flatMap((d) => d.items);
    const totalWords = new Set(Object.values(state.days).flatMap((d) => d.words.map((w) => w[0]))).size;
    const perLevel = LEVELS.map((l) => {
      const ids = SENTENCES.filter((s) => s.level === l).map((s) => s.id);
      const done = ids.filter((id) => state.history[id]);
      const perfect = done.filter((id) => state.history[id].grade === 'o');
      return { l, total: ids.length, done: done.length, perfect: perfect.length };
    });
    const counts = { o: 0, p: 0, x: 0 };
    allItems.forEach((it) => (counts[it.grade] += 1));
    const studyDays = Object.keys(state.days).filter((k) => state.days[k].items.length).length;

    $panel.innerHTML = `
      <div class="statgrid">
        <div class="stat"><b>${state.placed ? level() : '-'}</b><span>현재 레벨</span></div>
        <div class="stat"><b>${allItems.length}</b><span>푼 문제</span></div>
        <div class="stat"><b>${studyDays}</b><span>공부한 날</span></div>
        <div class="stat"><b>${totalWords}</b><span>만난 단어</span></div>
      </div>
      <div class="gradebar">
        <span class="o">⭕ ${counts.o}</span><span class="p">🔺 ${counts.p}</span><span class="x">❌ ${counts.x}</span>
      </div>
      <h3 class="sub">레벨별 진행</h3>
      <div class="levels">
        ${perLevel.map((p) => `
          <div class="lvrow ${state.placed && p.l === level() ? 'cur' : ''}">
            <span class="lvname">${p.l}</span>
            <div class="lvbar"><i class="done" style="width:${(p.done / p.total) * 100}%"></i><i class="perfect" style="width:${(p.perfect / p.total) * 100}%"></i></div>
            <span class="lvnum">${p.perfect}/${p.total}</span>
          </div>`).join('')}
      </div>
      <p class="soft small">진한 색은 ⭕로 맞힌 문장, 옅은 색은 풀어 본 문장이에요. 레벨이 바뀌면 그 레벨 문장이 먼저 나오고, 다 풀면 틀린 문장을 복습해요.</p>
      <div class="btnrow">
        <button class="btn ghost" data-act="retest">레벨 테스트 다시 보기</button>
        <button class="btn danger" data-act="reset">기록 초기화</button>
      </div>
    `;
  }

  // ───── 이벤트 ─────
  $tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    view = b.dataset.tab;
    render();
  });

  $panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'start-test' || act === 'retest') {
      state.placement = { step: 0, grades: [] };
      attempt = null;
      view = 'practice';
      save();
      render();
    } else if (act === 'pick-level' || act === 'finish-test') {
      state.placed = true;
      state.placement = null;
      state.levelIdx = Number(b.dataset.idx);
      state.meter = 30;
      state.currentId = null;
      attempt = null;
      save();
      render();
    } else if (act === 'reveal') {
      reveal(false);
    } else if (act === 'giveup') {
      reveal(true);
    } else if (act === 'grade') {
      applyGrade(currentSentence(), b.dataset.g);
      render();
    } else if (act === 'next') {
      if (state.placement) {
        if (state.placement.grades.length < PLACEMENT_IDS.length) state.placement.step += 1;
        attempt = null;
        save();
      } else {
        pickNext();
      }
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (act === 'dir') {
      if (attempt && attempt.revealed && !attempt.graded) return;
      state.dir = b.dataset.dir;
      attempt = null;
      save();
      render();
    } else if (act === 'copy') {
      copyWords();
    } else if (act === 'goto-practice') {
      view = 'practice';
      render();
    } else if (act === 'reset') {
      // 실수로 지우지 않도록 두 번 눌러야 초기화된다
      if (b.dataset.armed !== '1') {
        b.dataset.armed = '1';
        b.textContent = '한 번 더 누르면 모든 기록이 지워져요';
        return;
      }
      state = defaultState();
      attempt = null;
      save();
      view = 'practice';
      render();
    }
  });

  function copyWords() {
    const ta = document.getElementById('wordtext');
    const msg = document.getElementById('copy-msg');
    const done = () => {
      msg.textContent = '✅ 복사했어요! 단어 암기장에 붙여넣으세요.';
      msg.classList.add('good');
    };
    const fallback = () => {
      ta.removeAttribute('readonly');
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      try {
        document.execCommand('copy');
        done();
      } catch (e) {
        msg.textContent = '자동 복사가 안 돼요. 위 칸을 길게 눌러 전체 선택 후 복사해 주세요.';
      }
      ta.setAttribute('readonly', '');
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ta.value).then(done, fallback);
    } else {
      fallback();
    }
  }

  render();
})();
