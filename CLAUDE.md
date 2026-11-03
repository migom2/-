# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

빌드 도구·패키지·테스트가 없는 순수 HTML/CSS/JS 정적 사이트 모음입니다. 서로 독립된 앱 3개가 들어 있고, 각각 자기 `index.html`에서 바로 실행됩니다.

| 경로 | 앱 | 데이터 |
|---|---|---|
| `/` (루트) | 영단어 암기장 (TOEIC 800~900, Day 1~30) | `words.js` |
| `chinese-vocab/` | 중국어 단어장 (HSK 3~5급, Day 1~100) | `words.js`, `hanzi-parts.js`, `hanzi-auto.js` |
| `gratitude-jar/` | 감사 일기 유리병 | 없음 |

UI 문구, 주석, README는 모두 한국어입니다. 새로 쓰는 문구도 한국어로 맞춥니다.

## 실행 및 배포

```bash
npx serve .      # 아무 정적 서버나 사용 가능; index.html을 브라우저로 직접 열어도 동작
```

- 빌드, 린트, 테스트 명령은 없습니다. 변경 사항은 브라우저에서 직접 확인합니다.
- `.github/workflows/pages.yml`은 `claude/beautiful-galileo-2zpuqh` 브랜치에 push하면 저장소 루트 전체를 GitHub Pages(`https://migom2.github.io/-/`)에 배포합니다.
- `index.html`은 `style.css?v=…`, `app.js?v=…`처럼 쿼리 문자열로 캐시를 무효화합니다. CSS·JS·데이터 파일을 고치면 해당 `index.html`의 `?v=` 값도 함께 올려야 배포된 사이트에 반영됩니다.

## 구조 (두 단어장 앱 공통)

- 데이터 파일(`words.js` 등)이 전역 변수(`WORDS`, `HANZI_COMPONENTS`, `HANZI_AUTO_*`)를 정의하고, `app.js`보다 먼저 `<script>`로 로드됩니다. 모듈 시스템은 쓰지 않습니다.
- `app.js`는 IIFE 하나로 되어 있고 ES5 스타일(`var`, `function`)입니다. `gratitude-jar/app.js`만 `const`를 씁니다. 파일마다 기존 스타일을 따릅니다.
- **상태와 렌더링:** 하나의 `state` 객체가 있고, `render()`가 학습 범위 선택 상자(`renderDaySelect`), 탭(`renderTabs`), 현재 탭의 `renderXxx()`를 차례로 다시 그립니다. 각 `renderXxx()`는 `#panel`의 `innerHTML`을 통째로 다시 쓰고 이벤트를 다시 붙입니다. `render()`는 다시 그린 뒤 입력창 포커스와 커서 위치를 복원합니다.
- **탭 추가 방법:** 탭은 `TABS` 배열에 정의되어 있습니다. 새 탭을 만들면 `TABS`와 `render()`의 분기에 모두 추가해야 합니다.
- **학습 범위 필터:** 상단의 학습 범위(전체 / Day / 루트 앱의 내 단어장 카테고리)가 모든 탭에 공통으로 적용됩니다. 새 기능도 이 범위를 기준으로 단어를 골라야 합니다.

## 저장 (localStorage)

모든 기록은 브라우저 `localStorage`에 저장되며, 저장 실패(사생활 보호 모드 등)는 try/catch로 조용히 무시합니다.

- **키 이름:** 앱마다 접두사가 다르고(루트 `vocab-`, `chinese-vocab` `zh-`, `gratitude-jar` `gratitude-jar:`) 끝에 버전(`-v1`)을 붙입니다. 저장 형식을 바꾸면 키 버전을 올리거나 이전 데이터를 옮기는 처리를 넣어야 합니다.
- **백업/불러오기:** 통계 탭에서 접두사가 맞는 키 전체를 base64 코드로 내보내고 불러옵니다(`exportCode`/`importCode`, 코드 앞에 `ENV1:` 또는 `ZHV1:` 표시). 새 키를 추가할 때 같은 접두사를 쓰면 백업에 자동으로 포함됩니다.
- **루트 앱의 주요 키:**
  - `vocab-progress-v1`: 학습 진행
  - `vocab-write-progress-v1`: 쓰기 연습 기록
  - `vocab-custom-words-v1`, `vocab-custom-categories-v1`: 내 단어장
- **진행 초기화:** 루트 앱 단어장 탭의 "진행 초기화"는 쓰기 연습 기록까지 함께 지웁니다.

## 데이터 형식

- **루트 `words.js`:** `{ id, en, ko, day, example }` 형식이고 `day`는 1~30, 하루 100개입니다. `id`는 고유해야 합니다. 진행 기록이 `id`를 키로 저장되기 때문입니다.
- **`chinese-vocab/words.js`:** `{ id, hanzi, pinyin, ko, level, day }` 형식이고 `level`은 3~5, `day`는 1~100입니다. 매일 3·4·5급이 10개씩 섞입니다.
  - **필수 조건:** `pinyin`은 성조를 표시하고 한자 한 글자당 음절 하나씩 공백으로 구분합니다(`认为` → `rèn wéi`). 글자 수와 음절 수가 1:1이 아니면 성조 게임이 깨집니다.
- **한자 조립 게임 데이터:**
  - `hanzi-parts.js`: 직접 만든 한자 88자. 부수와 외우기 이야기가 들어 있고, 이야기 속 `【】` 안의 말은 부수 카드의 뜻과 같아야 합니다.
  - `hanzi-auto.js`: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)의 `dictionary.txt`를 바탕으로 자동 생성한 868자. 부수의 한국어 뜻은 직접 붙였습니다.
