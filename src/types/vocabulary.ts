export type VocabularyCategory =
  | 'Greetings & Social'
  | 'Emergency & Medical'
  | 'Daily Needs'
  | 'Questions & Responses'
  | 'Workplace & Education'
  | 'Travel & Transit'

export interface VocabularyItem {
  id: string
  classIndex: number
  sentence: string
  category: VocabularyCategory
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  context: string
  frames: number
  landmarkChannels: number
}
