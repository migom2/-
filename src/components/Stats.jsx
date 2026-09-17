import { useMemo } from 'react'
import words from '../data/words'

export default function Stats({ progress }) {
  const summary = useMemo(() => {
    let known = 0
    let learning = 0
    let neu = 0
    let correct = 0
    let wrong = 0

    for (const w of words) {
      const entry = progress[w.id]
      const status = entry?.status ?? 'new'
      if (status === 'known') known += 1
      else if (status === 'learning') learning += 1
      else neu += 1
      correct += entry?.correct ?? 0
      wrong += entry?.wrong ?? 0
    }

    const total = words.length
    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : null

    return { known, learning, neu, total, correct, wrong, accuracy }
  }, [progress])

  const knownPct = Math.round((summary.known / summary.total) * 100)

  return (
    <div className="panel">
      <h2>학습 통계</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-number">{summary.total}</span>
          <span className="stat-label">전체 단어</span>
        </div>
        <div className="stat-card stat-known">
          <span className="stat-number">{summary.known}</span>
          <span className="stat-label">암기완료</span>
        </div>
        <div className="stat-card stat-learning">
          <span className="stat-number">{summary.learning}</span>
          <span className="stat-label">학습중</span>
        </div>
        <div className="stat-card stat-new">
          <span className="stat-number">{summary.neu}</span>
          <span className="stat-label">신규</span>
        </div>
      </div>

      <div className="progress-bar-outer">
        <div className="progress-bar-inner" style={{ width: `${knownPct}%` }} />
      </div>
      <p className="hint">암기 완료율 {knownPct}%</p>

      <div className="quiz-stat">
        <h3>퀴즈 정답률</h3>
        <p>
          {summary.accuracy === null
            ? '아직 퀴즈를 풀지 않았어요.'
            : `${summary.accuracy}% (정답 ${summary.correct} / 오답 ${summary.wrong})`}
        </p>
      </div>
    </div>
  )
}
