import { useMemo, useState } from 'react'
import words from '../data/words'

const STATUS_LABEL = {
  new: '신규',
  learning: '학습중',
  known: '암기완료',
}

export default function WordList({ getEntry, resetProgress }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return words.filter((w) => {
      const entry = getEntry(w.id)
      const matchesQuery =
        query.trim() === '' ||
        w.en.toLowerCase().includes(query.trim().toLowerCase()) ||
        w.ko.includes(query.trim())
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [query, statusFilter, getEntry])

  function handleReset() {
    if (window.confirm('모든 학습 진행 상황을 초기화할까요?')) {
      resetProgress()
    }
  }

  return (
    <div className="panel">
      <div className="wordlist-controls">
        <input
          className="search-input"
          type="text"
          placeholder="단어 또는 뜻 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="new">신규</option>
          <option value="learning">학습중</option>
          <option value="known">암기완료</option>
        </select>
        <button className="btn btn-danger" onClick={handleReset}>
          진행 초기화
        </button>
      </div>

      <ul className="word-table">
        {filtered.map((w) => {
          const entry = getEntry(w.id)
          return (
            <li key={w.id} className="word-row">
              <div className="word-main">
                <strong>{w.en}</strong>
                <span className="level-tag">{w.level}</span>
              </div>
              <div className="word-ko">{w.ko}</div>
              <span className={`status-badge status-${entry.status}`}>
                {STATUS_LABEL[entry.status]}
              </span>
            </li>
          )
        })}
        {filtered.length === 0 && <li className="empty-state">검색 결과가 없어요.</li>}
      </ul>
    </div>
  )
}
