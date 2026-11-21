import type { AppSettings } from '../types/settings'
import { defaultSettings } from '../types/settings'
import type { ActivityRecord } from '../types/communication'
import type { RecognitionHistoryEntry } from '../types/recognition'
import type { UserLearningProgress } from '../types/learning'

const SETTINGS_KEY = 'echogesture.settings.v2'
const ACTIVITY_KEY = 'echogesture.activities.v2'
const HISTORY_KEY = 'echogesture.history.v2'
const LEARNING_KEY = 'echogesture.learning.v2'

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Graceful fallback when local storage is disabled
  }
}

export function loadSettings(): AppSettings {
  const raw = safeGetItem(SETTINGS_KEY)
  if (!raw) return defaultSettings
  try {
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: AppSettings): void {
  safeSetItem(SETTINGS_KEY, JSON.stringify(settings))
}

const DEFAULT_ACTIVITIES: ActivityRecord[] = [
  {
    id: 'act-1',
    type: 'emergency',
    title: 'Emergency phrase board accessed',
    detail: 'Standard manual offline phrases ready for rapid assistance.',
    timestamp: Date.now() - 1000 * 60 * 25,
  },
  {
    id: 'act-2',
    type: 'recognition',
    title: 'Camera workspace initialized',
    detail: 'Verified local device video stream permissions.',
    timestamp: Date.now() - 1000 * 60 * 95,
  },
  {
    id: 'act-3',
    type: 'learning',
    title: 'Framing & Posture lesson opened',
    detail: 'Practiced camera positioning and signing bounds.',
    timestamp: Date.now() - 1000 * 60 * 240,
  },
]

export function loadActivities(): ActivityRecord[] {
  const raw = safeGetItem(ACTIVITY_KEY)
  if (!raw) return DEFAULT_ACTIVITIES
  try {
    const parsed = JSON.parse(raw) as ActivityRecord[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ACTIVITIES
  } catch {
    return DEFAULT_ACTIVITIES
  }
}

export function recordActivity(record: Omit<ActivityRecord, 'id' | 'timestamp'>): void {
  const current = loadActivities()
  const entry: ActivityRecord = {
    ...record,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  }
  const next = [entry, ...current.filter((item) => item.title !== entry.title)].slice(0, 15)
  safeSetItem(ACTIVITY_KEY, JSON.stringify(next))
}

export function loadRecognitionHistory(): RecognitionHistoryEntry[] {
  const raw = safeGetItem(HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function addRecognitionHistory(item: Omit<RecognitionHistoryEntry, 'id' | 'timestamp'>): RecognitionHistoryEntry {
  const current = loadRecognitionHistory()
  const entry: RecognitionHistoryEntry = {
    ...item,
    id: `rec-${Date.now()}`,
    timestamp: Date.now(),
  }
  const next = [entry, ...current].slice(0, 20)
  safeSetItem(HISTORY_KEY, JSON.stringify(next))
  return entry
}

export function clearRecognitionHistory(): void {
  safeSetItem(HISTORY_KEY, JSON.stringify([]))
}

export function loadLearningProgress(): UserLearningProgress {
  const raw = safeGetItem(LEARNING_KEY)
  const defaultProgress: UserLearningProgress = {
    completedLessonIds: ['lesson-1'],
    completedVocabularyIds: ['isl-01', 'isl-03'],
    practiceNotes: {
      'lesson-1': 'Ensured daylight faces me directly and hands are visible.',
    },
    lastPracticedDate: new Date().toISOString().split('T')[0],
  }
  if (!raw) return defaultProgress
  try {
    return { ...defaultProgress, ...JSON.parse(raw) }
  } catch {
    return defaultProgress
  }
}

export function saveLearningProgress(progress: UserLearningProgress): void {
  safeSetItem(LEARNING_KEY, JSON.stringify(progress))
}

export function clearAllApplicationData(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    localStorage.removeItem(ACTIVITY_KEY)
    localStorage.removeItem(HISTORY_KEY)
    localStorage.removeItem(LEARNING_KEY)
  } catch {
    // Ignore error
  }
}
