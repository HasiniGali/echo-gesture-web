import { useEffect, useState } from 'react'
import { CircleAlert, Cloud, CloudOff } from 'lucide-react'
import { getApiHealth, type ApiHealth } from '../services/apiClient'

type ConnectionState = 'checking' | 'offline' | 'ready' | 'model-unavailable'

export function BackendStatus() {
  const [state, setState] = useState<ConnectionState>('checking')
  const [health, setHealth] = useState<ApiHealth | null>(null)

  useEffect(() => {
    let active = true
    getApiHealth().then((result) => {
      if (!active) return
      setHealth(result)
      setState(result.recognition_model === 'available' ? 'ready' : 'model-unavailable')
    }).catch(() => {
      if (active) setState('offline')
    })
    return () => { active = false }
  }, [])

  const text = state === 'checking' ? 'Checking services'
    : state === 'offline' ? 'Backend offline'
      : state === 'ready' ? 'Backend connected'
        : 'Model not connected'
  const title = state === 'offline' ? 'The API is unavailable. Browser-local features remain available.'
    : health ? `API and SQLite connected. Translation ${health.translation_service}. Recognition model ${health.recognition_model}.`
      : 'Checking EchoGesture backend status.'
  const Icon = state === 'offline' ? CloudOff : state === 'model-unavailable' ? CircleAlert : Cloud

  return <span className={`backend-status backend-${state}`} title={title} role="status"><Icon size={14} /><span>{text}</span></span>
}
