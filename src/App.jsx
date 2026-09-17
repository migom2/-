import { useState } from 'react'
import NavBar from './components/NavBar'
import Flashcards from './components/Flashcards'
import Quiz from './components/Quiz'
import WordList from './components/WordList'
import Stats from './components/Stats'
import useProgress from './hooks/useProgress'
import './App.css'

function App() {
  const [tab, setTab] = useState('flashcards')
  const { progress, getEntry, setStatus, recordQuizResult, resetProgress } = useProgress()

  return (
    <div className="app">
      <header className="app-header">
        <h1>영단어 암기장</h1>
        <p className="subtitle">플래시카드로 외우고, 퀴즈로 확인하세요</p>
      </header>

      <NavBar active={tab} onChange={setTab} />

      <main className="app-main">
        {tab === 'flashcards' && <Flashcards getEntry={getEntry} setStatus={setStatus} />}
        {tab === 'quiz' && <Quiz recordQuizResult={recordQuizResult} />}
        {tab === 'words' && <WordList getEntry={getEntry} resetProgress={resetProgress} />}
        {tab === 'stats' && <Stats progress={progress} />}
      </main>
    </div>
  )
}

export default App
