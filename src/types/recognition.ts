export type RecognitionStatus = 'idle' | 'listening' | 'processing' | 'unconnected' | 'error'

export interface RecognitionResult {
  text: string
  confidence: number
  classIndex: number
  timestamp: number
  simulated?: boolean
}

export interface RecognitionHistoryEntry {
  id: string
  text: string
  timestamp: number
  category?: string
  confidence?: number
  source: 'demo' | 'simulation' | 'model'
}

export interface RecognitionRuntimeOptions {
  modelUrl: string
  preferredBackend: 'webgpu' | 'wasm'
  inputShape: readonly [60, 258]
  rejectionThreshold: number
}

export interface LandmarkExtractionPipeline {
  name: string
  version: string
  status: 'disconnected' | 'ready' | 'active'
  channels: 258
  fps: 30
}

export interface RecognitionProvider {
  initialize(options: RecognitionRuntimeOptions): Promise<void>
  recognize(features: Float32Array): Promise<RecognitionResult | null>
  dispose(): void
}
