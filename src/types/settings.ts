export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'blue' | 'teal' | 'lavender' | 'mint' | 'peach'
export type TextSize = 'normal' | 'medium' | 'large'
export type ControlSize = 'normal' | 'large'

export interface AppSettings {
  preferredLanguage: string
  speechRate: number
  speechPitch: number
  selectedVoiceURI: string
  theme: ThemeMode
  accent: AccentColor
  highContrast: boolean
  reducedMotion: boolean
  textSize: TextSize
  largerControls: boolean
  voiceAssistance: boolean
  hapticFeedback: boolean
}

export const defaultSettings: AppSettings = {
  preferredLanguage: 'English',
  speechRate: 1.0,
  speechPitch: 1.0,
  selectedVoiceURI: '',
  theme: 'light',
  accent: 'blue',
  highContrast: false,
  reducedMotion: false,
  textSize: 'normal',
  largerControls: false,
  voiceAssistance: false,
  hapticFeedback: false,
}

export interface SettingsOutletContext {
  settings: AppSettings
  updateSettings: (settings: AppSettings) => void
}
