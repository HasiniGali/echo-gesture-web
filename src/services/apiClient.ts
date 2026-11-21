import type { AppSettings } from '../settings'

export interface ApiHealth {
  status: 'ok'
  database: 'connected'
  recognition_model: 'available' | 'unavailable'
  translation_service: 'available' | 'unavailable'
}

export interface RecognitionApiStatus {
  available: boolean
  reason: string | null
  input_shape: [number, number]
  rejection_threshold: number | null
}

export interface RecognitionPrediction {
  status: 'accepted' | 'rejected'
  sentence: string | null
  class_index: number | null
  confidence: number | null
  rejection_reason: string | null
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const apiBase = (
  import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/$/, '')

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(
      'EchoGesture backend is offline.',
      0,
      'backend_offline',
    )
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const detail =
      typeof body === 'object' &&
      body !== null &&
      'detail' in body
        ? body.detail
        : body

    const detailObject =
      typeof detail === 'object' && detail !== null
        ? detail
        : null

    const message =
      detailObject &&
      'message' in detailObject &&
      typeof detailObject.message === 'string'
        ? detailObject.message
        : typeof detail === 'string'
          ? detail
          : `Backend request failed (${response.status}).`

    const code =
      detailObject &&
      'code' in detailObject &&
      typeof detailObject.code === 'string'
        ? detailObject.code
        : undefined

    throw new ApiError(message, response.status, code)
  }

  return body as T
}

export function getApiHealth(): Promise<ApiHealth> {
  return request<ApiHealth>('/health')
}

export function getRecognitionApiStatus(): Promise<RecognitionApiStatus> {
  return request<RecognitionApiStatus>('/recognition/status')
}

/**
 * Send a preprocessed 60 × 258 landmark sequence
 * to the EchoGesture recognition backend.
 */
export function predictRecognition(
  features: number[][],
): Promise<RecognitionPrediction> {
  if (features.length !== 60) {
    throw new Error(
      `Expected 60 frames, received ${features.length}.`,
    )
  }

  if (features.some((frame) => frame.length !== 258)) {
    throw new Error(
      'Every recognition frame must contain exactly 258 features.',
    )
  }

  return request<RecognitionPrediction>(
    '/recognition/predict',
    {
      method: 'POST',
      body: JSON.stringify({ features }),
    },
  )
}

export async function translateMessage(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const result = await request<{ text: string }>(
    '/translation',
    {
      method: 'POST',
      body: JSON.stringify({
        text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
      }),
    },
  )

  return result.text
}

export function saveRemoteSettings(
  settings: AppSettings,
): Promise<{ settings: AppSettings }> {
  return request<{ settings: AppSettings }>(
    '/settings',
    {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    },
  )
}

export async function getEmergencyFavorites(): Promise<string[]> {
  const result = await request<{ items: string[] }>(
    '/history/favorites',
  )

  return result.items
}

export function addEmergencyFavorite(
  phrase: string,
): Promise<{ phrase: string }> {
  return request<{ phrase: string }>(
    '/history/favorites',
    {
      method: 'POST',
      body: JSON.stringify({ phrase }),
    },
  )
}

export function removeEmergencyFavorite(
  phrase: string,
): Promise<{ phrase: string }> {
  return request<{ phrase: string }>(
    '/history/favorites/remove',
    {
      method: 'POST',
      body: JSON.stringify({ phrase }),
    },
  )
}

export interface EmergencyPhraseHistoryItem {
  id: number
  phrase: string
  used_at: string
}

export async function getEmergencyPhraseHistory(): Promise<
  EmergencyPhraseHistoryItem[]
> {
  const result = await request<{
    items: EmergencyPhraseHistoryItem[]
  }>('/history/emergency-phrases')

  return result.items
}

export function recordEmergencyPhrase(
  phrase: string,
): Promise<EmergencyPhraseHistoryItem> {
  return request<EmergencyPhraseHistoryItem>(
    '/history/emergency-phrases',
    {
      method: 'POST',
      body: JSON.stringify({ phrase }),
    },
  )
}

export function saveLearningProgress(
  lessonId: string,
  completed: boolean,
  quizScore?: number,
): Promise<unknown> {
  return request('/learning/progress', {
    method: 'PUT',
    body: JSON.stringify({
      lesson_id: lessonId,
      completed,
      quiz_score: quizScore ?? null,
    }),
  })
}

export interface TranslationHistoryItem {
  id?: number
  source_text: string
  source_language: string
  target_language: string
  translated_text: string
  created_at: string
}

export async function getTranslationHistory(): Promise<
  TranslationHistoryItem[]
> {
  const result = await request<{
    items: TranslationHistoryItem[]
  }>('/history/translations')

  return result.items
}

export async function getTranslationFavorites(): Promise<
  TranslationHistoryItem[]
> {
  const result = await request<{
    items: TranslationHistoryItem[]
  }>('/history/translation-favorites')

  return result.items
}

function translationFavoritePayload(
  item: Pick<
    TranslationHistoryItem,
    | 'source_text'
    | 'source_language'
    | 'target_language'
    | 'translated_text'
  >,
) {
  return {
    source_text: item.source_text,
    source_language: item.source_language,
    target_language: item.target_language,
    translated_text: item.translated_text,
  }
}

export function addTranslationFavorite(
  item: TranslationHistoryItem,
): Promise<unknown> {
  return request('/history/translation-favorites', {
    method: 'POST',
    body: JSON.stringify(
      translationFavoritePayload(item),
    ),
  })
}

export function removeTranslationFavorite(
  item: TranslationHistoryItem,
): Promise<unknown> {
  return request('/history/translation-favorites/remove', {
    method: 'POST',
    body: JSON.stringify(
      translationFavoritePayload(item),
    ),
  })
}

export interface LearningProgressItem {
  lesson_id: string
  completed: boolean | number
  quiz_score: number | null
  updated_at: string
}

export async function getLearningProgress(): Promise<
  LearningProgressItem[]
> {
  const result = await request<{
    items: LearningProgressItem[]
  }>('/learning/progress')

  return result.items
}