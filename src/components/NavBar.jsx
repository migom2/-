const TABS = [
  { key: 'flashcards', label: '📇 플래시카드' },
  { key: 'quiz', label: '📝 퀴즈' },
  { key: 'words', label: '📚 단어장' },
  { key: 'stats', label: '📊 통계' },
]

export default function NavBar({ active, onChange }) {
  return (
    <nav className="navbar">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-tab ${active === tab.key ? 'nav-tab-active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
