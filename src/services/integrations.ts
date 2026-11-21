export interface RecognitionResult {
  text: string
  confidence: number
}

export interface RecognitionRuntimeOptions {
  modelUrl: string
  preferredBackend: 'webgpu' | 'wasm'
  inputShape: readonly [60, 258]
  rejectionThreshold: number
}

export interface RecognitionProvider {
  initialize(options: RecognitionRuntimeOptions): Promise<void>
  recognize(features: Float32Array): Promise<RecognitionResult | null>
  dispose(): void
}

export interface TranslationProvider {
  translate(text: string, from: string, to: string): Promise<string>
}

// The interfaces are ready for a real ONNX Runtime Web and translation adapter.
// A missing provider stays explicit; the UI must never imply a prediction exists.
export const recognitionProvider: RecognitionProvider | null = null
export const translationProvider: TranslationProvider | null = null

export async function translateText(text: string, from: string, to: string): Promise<string> {
  if (!translationProvider) throw new Error('No translation service is connected yet.')
  return translationProvider.translate(text, from, to)
}

export async function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function speakText(text: string, language = 'en-IN', rate = 1): boolean {
  if (!text.trim() || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language
  utterance.rate = rate
  window.speechSynthesis.speak(utterance)
  return true
}

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

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
  return Constructor ? new Constructor() : null
}
