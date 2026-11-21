export interface SpeechRecognitionResultLike {
  readonly length: number
  readonly [index: number]: { transcript: string }
  readonly isFinal: boolean
}

export interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionResultLike>
  readonly resultIndex: number
}

export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

export interface ActivityRecord {
  id: string
  type: 'speech' | 'recognition' | 'emergency' | 'learning' | 'translation'
  title: string
  detail: string
  timestamp: number
}
