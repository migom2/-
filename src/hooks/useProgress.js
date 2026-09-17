import { useCallback, useEffect, useState } from 'react'
import { loadProgress, saveProgress } from '../utils/storage'

// 단어별 진행 상태: 'new' | 'learning' | 'known'
export default function useProgress() {
  const [progress, setProgress] = useState(loadProgress)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const getEntry = useCallback(
    (id) => progress[id] ?? { status: 'new', correct: 0, wrong: 0 },
    [progress],
  )

  const setStatus = useCallback((id, status) => {
    setProgress((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { correct: 0, wrong: 0 }), status },
    }))
  }, [])

  const recordQuizResult = useCallback((id, isCorrect) => {
    setProgress((prev) => {
      const entry = prev[id] ?? { status: 'new', correct: 0, wrong: 0 }
      return {
        ...prev,
        [id]: {
          correct: entry.correct + (isCorrect ? 1 : 0),
          wrong: entry.wrong + (isCorrect ? 0 : 1),
          status: isCorrect ? 'known' : 'learning',
        },
      }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setProgress({})
  }, [])

  return { progress, getEntry, setStatus, recordQuizResult, resetProgress }
}
