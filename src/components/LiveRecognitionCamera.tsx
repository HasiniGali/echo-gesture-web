import { useEffect, useRef, useState } from 'react'

import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
} from '@mediapipe/tasks-vision'

import {
  buildModelSequence,
  type LandmarkFrame,
  type Landmark3D,
  type HandLandmark3D,
} from '../services/preprocessingContract'

import {
  predictRecognition,
  type RecognitionPrediction,
} from '../services/apiClient'

interface LiveRecognitionCameraProps {
  onPrediction: (result: RecognitionPrediction) => void
}

const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'

const REQUIRED_FRAMES = 60

export function LiveRecognitionCamera({
  onPrediction,
}: LiveRecognitionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const poseRef = useRef<PoseLandmarker | null>(null)
  const handRef = useRef<HandLandmarker | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  const frameBufferRef = useRef<LandmarkFrame[]>([])
  const callbackRef = useRef(onPrediction)

  const lastCaptureRef = useRef(0)
  const processingRef = useRef(false)
  const mountedRef = useRef(false)

  const [cameraReady, setCameraReady] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [capturedFrames, setCapturedFrames] = useState(0)
  const [message, setMessage] = useState('Initializing camera...')

  useEffect(() => {
    callbackRef.current = onPrediction
  }, [onPrediction])

  useEffect(() => {
    mountedRef.current = true

    async function initialize() {
      try {
        setMessage('Requesting camera access...')

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })

        streamRef.current = stream

        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        const video = videoRef.current

        if (!video) {
          throw new Error('Camera video element is unavailable.')
        }

        video.srcObject = stream

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve()
        })

        await video.play()

        setCameraReady(true)
        setMessage('Loading landmark models...')

        const vision = await FilesetResolver.forVisionTasks(
          WASM_URL,
        )

        const poseLandmarker =
          await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: POSE_MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          })

        const handLandmarker =
          await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: HAND_MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 2,
          })

        if (!mountedRef.current) {
          poseLandmarker.close()
          handLandmarker.close()
          return
        }

        poseRef.current = poseLandmarker
        handRef.current = handLandmarker

        setModelReady(true)
        setMessage('Ready. Perform a sign in front of the camera.')

        startDetection()
      } catch (error) {
        console.error('Camera initialization failed:', error)

        if (mountedRef.current) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Unable to initialize camera recognition.',
          )
        }
      }
    }

    function startDetection() {
      function detect() {
        if (!mountedRef.current) {
          return
        }

        animationRef.current = requestAnimationFrame(detect)

        const video = videoRef.current
        const poseLandmarker = poseRef.current
        const handLandmarker = handRef.current

        if (
          !video ||
          !poseLandmarker ||
          !handLandmarker ||
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          return
        }

        const now = performance.now()

        // Capture approximately 15 frames per second.
        if (now - lastCaptureRef.current < 66) {
          return
        }

        lastCaptureRef.current = now

        try {
          const poseResult = poseLandmarker.detectForVideo(
            video,
            now,
          )

          const handResult = handLandmarker.detectForVideo(
            video,
            now,
          )

          const pose = convertPose(
  poseResult.landmarks[0] ?? null,
)

let leftHand: HandLandmark3D[] | null = null
let rightHand: HandLandmark3D[] | null = null

const hands = handResult.landmarks
const handedness = handResult.handedness

          for (let i = 0; i < hands.length; i++) {
            const category =
              handedness[i]?.[0]?.categoryName?.toLowerCase()

            const converted = convertHand(hands[i])

            if (category === 'left') {
              leftHand = converted
            } else if (category === 'right') {
              rightHand = converted
            }
          }

          const frame: LandmarkFrame = {
            pose,
            leftHand,
            rightHand,
          }

          frameBufferRef.current.push(frame)

          if (frameBufferRef.current.length > REQUIRED_FRAMES) {
            frameBufferRef.current.shift()
          }

          setCapturedFrames(frameBufferRef.current.length)

          if (
            frameBufferRef.current.length === REQUIRED_FRAMES &&
            !processingRef.current
          ) {
            processingRef.current = true

            const sequence = buildModelSequence(
              frameBufferRef.current,
            )

            setMessage('Analyzing sign...')

            predictRecognition(sequence)
              .then((result) => {
                if (!mountedRef.current) {
                  return
                }

                callbackRef.current(result)

                if (result.status === 'accepted') {
                  setMessage(
                    `Recognized: ${result.sentence ?? 'Sign'}`,
                  )
                } else {
                  setMessage(
                    'Sign not confidently recognized. Try again.',
                  )
                }
              })
              .catch((error: unknown) => {
                console.error('Recognition request failed:', error)

                if (mountedRef.current) {
                  setMessage('Recognition API request failed.')
                }
              })
              .finally(() => {
                processingRef.current = false
                frameBufferRef.current = []
                setCapturedFrames(0)
              })
          }
        } catch (error) {
          console.error('Landmark detection failed:', error)
        }
      }

      animationRef.current = requestAnimationFrame(detect)
    }

    void initialize()

    return () => {
      mountedRef.current = false

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop()
      })

      streamRef.current = null

      poseRef.current?.close()
      handRef.current?.close()

      poseRef.current = null
      handRef.current = null
    }
  }, [])

  return (
    <div className="live-recognition-camera">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          maxWidth: '640px',
          borderRadius: '12px',
          transform: 'scaleX(-1)',
        }}
      />

      <div style={{ marginTop: '12px' }}>
        <p>
          <strong>Camera:</strong>{' '}
          {cameraReady ? 'Connected' : 'Waiting'}
        </p>

        <p>
          <strong>Landmark models:</strong>{' '}
          {modelReady ? 'Ready' : 'Loading'}
        </p>

        <p>
          <strong>Captured frames:</strong>{' '}
          {capturedFrames}/{REQUIRED_FRAMES}
        </p>

        <p aria-live="polite">{message}</p>
      </div>
    </div>
  )
}

function convertPose(
  landmarks:
    | Array<{
        x: number
        y: number
        z: number
        visibility?: number
      }>
    | null,
): Landmark3D[] | null {
  if (!landmarks || landmarks.length !== 33) {
    return null
  }

  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility ?? 0,
  }))
}

function convertHand(
  landmarks: Array<{
    x: number
    y: number
    z: number
  }>,
): HandLandmark3D[] {
  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  }))
}