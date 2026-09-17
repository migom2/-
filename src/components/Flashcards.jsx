import { useMemo, useState } from 'react'
import words from '../data/words'
import { shuffle } from '../utils/shuffle'

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'new', label: '신규' },
  { key: 'learning', label: '학습중' },
  { key: 'known', label: '암기완료' },
]

export default function Flashcards({ getEntry, setStatus }) {
  const [filter, setFilter] = useState('all')
  const [seed, setSeed] = useState(0)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const deck = useMemo(() => {
    const filtered =
      filter === 'all' ? words : words.filter((w) => getEntry(w.id).status === filter)
    return shuffle(filtered)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, seed])

  const current = deck[index]

  function goNext() {
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  function handleAnswer(status) {
    setStatus(current.id, status)
    goNext()
  }

  function restart() {
    setIndex(0)
    setFlipped(false)
    setSeed((s) => s + 1)
  }

  function handleFilterChange(key) {
    setFilter(key)
    setIndex(0)
    setFlipped(false)
    setSeed((s) => s + 1)
  }

  return (
    <div className="panel">
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? 'chip-active' : ''}`}
            onClick={() => handleFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {deck.length === 0 && (
        <div className="empty-state">
          <p>이 카테고리에는 단어가 없어요.</p>
        </div>
      )}

      {deck.length > 0 && index >= deck.length && (
        <div className="empty-state">
          <p>🎉 이번 세트를 모두 학습했어요!</p>
          <button className="btn btn-primary" onClick={restart}>
            다시 섞어서 학습하기
          </button>
        </div>
      )}

      {deck.length > 0 && current && (
        <>
          <p className="progress-label">
            {index + 1} / {deck.length}
          </p>
          <div
            className={`flashcard ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped((f) => !f)}
          >
            <div className="flashcard-inner">
              <div className="flashcard-face flashcard-front">
                <span className="level-badge">{current.level}</span>
                <h2>{current.en}</h2>
                <p className="hint">클릭해서 뜻 보기</p>
              </div>
              <div className="flashcard-face flashcard-back">
                <h3>{current.ko}</h3>
                <p className="example">{current.example}</p>
              </div>
            </div>
          </div>

          <div className="answer-row">
            <button className="btn btn-danger" onClick={() => handleAnswer('learning')}>
              🙈 몰라요
            </button>
            <button className="btn btn-success" onClick={() => handleAnswer('known')}>
              ✅ 알아요
            </button>
          </div>
        </>
      )}
    </div>
  )
}
