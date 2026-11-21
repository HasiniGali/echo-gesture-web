import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, CircleAlert, LoaderCircle } from 'lucide-react'

type CameraState = 'idle' | 'starting' | 'active' | 'error'

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [cameraState])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  async function startCamera(deviceId?: string) {
    setErrorMessage('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera access is unavailable in this browser or page context.')
      setCameraState('error')
      return
    }
    setCameraState('starting')
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      const video: MediaTrackConstraints = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      try {
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput')
        setCameraDevices(devices)
        const activeDevice = stream.getVideoTracks()[0]?.getSettings().deviceId
        setSelectedDeviceId(activeDevice ?? deviceId ?? '')
      } catch {
        setCameraDevices([])
      }
      setCameraState('active')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      setErrorMessage(name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings to continue.'
        : 'The camera could not be opened. Check that it is connected and not in use by another app.')
      setCameraState('error')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState('idle')
  }

  return (
    <section className="camera-panel" aria-label="Camera preview">
      <div className="camera-frame">
        {cameraState === 'active' ? (
          <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
        ) : (
          <div className="camera-placeholder">
            {cameraState === 'starting' ? <LoaderCircle className="spin" size={32} /> : <Camera size={34} strokeWidth={1.6} />}
            <strong>{cameraState === 'starting' ? 'Connecting to camera' : 'Camera preview'}</strong>
            <span>{cameraState === 'error' ? errorMessage : 'Your video stays on this device.'}</span>
          </div>
        )}
        <span className={`camera-state ${cameraState === 'active' ? 'is-live' : ''}`}>
          <span />{cameraState === 'active' ? 'Camera on' : cameraState === 'starting' ? 'Connecting' : 'Camera off'}
        </span>
      </div>
      <div className="camera-controls">
        {cameraState === 'active' ? (
          <button type="button" className="button button-secondary" onClick={stopCamera}><CameraOff size={17} /> Stop camera</button>
        ) : (
          <button type="button" className="button button-primary" onClick={() => void startCamera()} disabled={cameraState === 'starting'}>
            {cameraState === 'error' ? <CircleAlert size={17} /> : <Camera size={17} />}
            {cameraState === 'starting' ? 'Starting…' : 'Start camera'}
          </button>
        )}
        {cameraState === 'active' && cameraDevices.length > 1 && <label className="camera-device-select"><span>Camera</span><select aria-label="Camera device" value={selectedDeviceId} onChange={(event) => void startCamera(event.target.value)}>{cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>}
        <span className="camera-privacy">Camera access is only used for local preview.</span>
      </div>
    </section>
  )
}
