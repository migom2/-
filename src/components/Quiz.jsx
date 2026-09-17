import { useMemo, useState } from 'react'
import words from '../data/words'
import { shuffle } from '../utils/shuffle'

const COUNT_OPTIONS = [10, 20, words.length]

function buildQuestions(count) {
  const chosen = shuffle(words).slice(0, count)
  return chosen.map((word) => {
    const distractors = shuffle(words.filter((w) => w.id !== word.id))
      .slice(0, 3)
      .map((w) => w.ko)
    return { word, options: shuffle([word.ko, ...distractors]) }
  })
}

export default function Quiz({ recordQuizResult }) {
  const [stage, setStage] = useState('setup') // setup | playing | finished
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [wrongWords, setWrongWords] = useState([])

  const current = questions[index]
  const isLast = index === questions.length - 1

  function startQuiz(count) {
    setQuestions(buildQuestions(Math.min(count, words.length)))
    setIndex(0)
    setSelected(null)
    setScore(0)
    setWrongWords([])
    setStage('playing')
  }

  function handleSelect(option) {
    if (selected) return
    const isCorrect = option === current.word.ko
    setSelected(option)
    recordQuizResult(current.word.id, isCorrect)
    if (isCorrect) {
      setScore((s) => s + 1)
    } else {
      setWrongWords((w) => [...w, current.word])
    }
  }

  function handleNext() {
    if (isLast) {
      setStage('finished')
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
  }

  const total = questions.length

  const optionClass = useMemo(
    () => (option) => {
      if (!selected) return 'option'
      if (option === current.word.ko) return 'option option-correct'
      if (option === selected) return 'option option-wrong'
      return 'option'
    },
    [selected, current],
  )

  if (stage === 'setup') {
    return (
      <div className="panel">
        <h2>퀴즈 시작하기</h2>
        <p className="hint">몇 문제를 풀어볼까요?</p>
        <div className="answer-row">
          {COUNT_OPTIONS.map((count) => (
            <button key={count} className="btn btn-primary" onClick={() => startQuiz(count)}>
              {count}문제
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (stage === 'finished') {
    return (
      <div className="panel">
        <h2>퀴즈 결과</h2>
        <p className="score">
          {score} / {total} 정답
        </p>
        {wrongWords.length > 0 && (
          <div className="wrong-list">
            <h3>틀린 단어</h3>
            <ul>
              {wrongWords.map((w) => (
                <li key={w.id}>
                  <strong>{w.en}</strong> — {w.ko}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button className="btn btn-primary" onClick={() => setStage('setup')}>
          다시 풀기
        </button>
      </div>
    )
  }

  return (
    <div className="panel">
      <p className="progress-label">
        {index + 1} / {total}
      </p>
      <h2 className="quiz-word">{current.word.en}</h2>
      <p className="hint">알맞은 뜻을 고르세요</p>
      <div className="options">
        {current.options.map((option) => (
          <button
            key={option}
            className={optionClass(option)}
            onClick={() => handleSelect(option)}
            disabled={!!selected}
          >
            {option}
          </button>
        ))}
      </div>
      {selected && (
        <button className="btn btn-primary" onClick={handleNext}>
          {isLast ? '결과 보기' : '다음 문제'}
        </button>
      )}
    </div>
  )
}
