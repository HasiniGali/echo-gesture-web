export interface LearningLesson {
  id: string
  title: string
  category: string
  description: string
  focus: string
  targetClasses: string[]
  durationMinutes: number
  steps: {
    instruction: string
    note: string
  }[]
}

export interface UserLearningProgress {
  completedLessonIds: string[]
  completedVocabularyIds: string[]
  practiceNotes: Record<string, string>
  lastPracticedDate: string
}
