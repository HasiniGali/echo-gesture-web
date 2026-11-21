export type AppSettings = {
  preferredLanguage: string
  speechRate: number
  theme: 'light' | 'dark' | 'system'
  accent: 'lavender' | 'rose' | 'blue' | 'mint' | 'peach'
  highContrast: boolean
  reducedMotion: boolean
  largerText: boolean
  largerControls: boolean
  voiceAssistance: boolean
}

export const defaultSettings: AppSettings = {
  preferredLanguage: 'English',
  speechRate: 1,
  theme: 'light',
  accent: 'lavender',
  highContrast: false,
  reducedMotion: false,
  largerText: false,
  largerControls: false,
  voiceAssistance: false,
}

const settingsKey = 'echogesture.settings.v1'

export function readSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(settingsKey)
    return stored ? { ...defaultSettings, ...JSON.parse(stored) as Partial<AppSettings> } : defaultSettings
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(settingsKey, JSON.stringify(settings))
}

export type SettingsOutletContext = {
  settings: AppSettings
  updateSettings: (settings: AppSettings) => void
}
