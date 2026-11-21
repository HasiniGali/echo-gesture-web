/**
 * EchoGesture preprocessing contract
 *
 * Contract ID:
 * colab-full-keypoints-cell57-cell46-normalization-v1
 *
 * Feature layout per frame:
 *   Pose:       33 landmarks × (x, y, z, visibility) = 132
 *   Left hand:  21 landmarks × (x, y, z)             =  63
 *   Right hand: 21 landmarks × (x, y, z)             =  63
 *   Total:                                           = 258
 *
 * Sequence:
 *   60 frames
 *
 * Normalization:
 *   - Center using midpoint of pose shoulders 11 and 12
 *   - Scale using 3D shoulder distance
 *   - Keep pose visibility unchanged
 *   - Missing pose: zero frame
 *   - Missing hands: zero-fill
 *   - Short sequence: trailing zero-padding
 */

export const PREPROCESSING_CONTRACT_ID =
  'colab-full-keypoints-cell57-cell46-normalization-v1'

export const FRAME_COUNT = 60
export const FEATURE_COUNT = 258

export const POSE_LANDMARK_COUNT = 33
export const HAND_LANDMARK_COUNT = 21

export type Landmark3D = {
  x: number
  y: number
  z: number
  visibility?: number
}

export type HandLandmark3D = {
  x: number
  y: number
  z: number
}

export type LandmarkFrame = {
  pose: Landmark3D[] | null
  leftHand: HandLandmark3D[] | null
  rightHand: HandLandmark3D[] | null
}

function zeroFrame(): number[] {
  return new Array<number>(FEATURE_COUNT).fill(0)
}

function isFiniteLandmark(
  landmark: { x: number; y: number; z: number },
): boolean {
  return (
    Number.isFinite(landmark.x) &&
    Number.isFinite(landmark.y) &&
    Number.isFinite(landmark.z)
  )
}

/**
 * Convert one detected frame into the original 258-feature layout.
 */
export function preprocessFrame(frame: LandmarkFrame): number[] {
  const pose = frame.pose

  // Original contract: if pose is absent, the entire frame is zero.
  if (!pose || pose.length !== POSE_LANDMARK_COUNT) {
    return zeroFrame()
  }

  const leftShoulder = pose[11]
  const rightShoulder = pose[12]

  if (
    !leftShoulder ||
    !rightShoulder ||
    !isFiniteLandmark(leftShoulder) ||
    !isFiniteLandmark(rightShoulder)
  ) {
    return zeroFrame()
  }

  // 3D midpoint of the shoulders.
  const centerX = (leftShoulder.x + rightShoulder.x) / 2
  const centerY = (leftShoulder.y + rightShoulder.y) / 2
  const centerZ = (leftShoulder.z + rightShoulder.z) / 2

  // 3D shoulder distance: the scale factor.
  const dx = rightShoulder.x - leftShoulder.x
  const dy = rightShoulder.y - leftShoulder.y
  const dz = rightShoulder.z - leftShoulder.z

  const shoulderDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (!Number.isFinite(shoulderDistance) || shoulderDistance <= 1e-8) {
    return zeroFrame()
  }

  const features: number[] = []

  // Pose: 33 × [normalized x, normalized y, normalized z, visibility]
  for (const landmark of pose) {
    if (!isFiniteLandmark(landmark)) {
      return zeroFrame()
    }

    features.push(
      (landmark.x - centerX) / shoulderDistance,
      (landmark.y - centerY) / shoulderDistance,
      (landmark.z - centerZ) / shoulderDistance,
      landmark.visibility ?? 0,
    )
  }

  // Left hand: 21 × [normalized x, normalized y, normalized z]
  appendHand(features, frame.leftHand, centerX, centerY, centerZ, shoulderDistance)

  // Right hand: 21 × [normalized x, normalized y, normalized z]
  appendHand(features, frame.rightHand, centerX, centerY, centerZ, shoulderDistance)

  if (features.length !== FEATURE_COUNT) {
    throw new Error(
      `Preprocessing contract violation: expected ${FEATURE_COUNT}, got ${features.length}`,
    )
  }

  if (!features.every(Number.isFinite)) {
    throw new Error('Preprocessing produced non-finite features')
  }

  return features
}

function appendHand(
  output: number[],
  hand: HandLandmark3D[] | null,
  centerX: number,
  centerY: number,
  centerZ: number,
  scale: number,
): void {
  // Missing hand: 63 zeros.
  if (!hand || hand.length !== HAND_LANDMARK_COUNT) {
    output.push(...new Array<number>(HAND_LANDMARK_COUNT * 3).fill(0))
    return
  }

  for (const landmark of hand) {
    if (!isFiniteLandmark(landmark)) {
      output.push(0, 0, 0)
      continue
    }

    output.push(
      (landmark.x - centerX) / scale,
      (landmark.y - centerY) / scale,
      (landmark.z - centerZ) / scale,
    )
  }
}

/**
 * Convert processed frames into the model's exact [60, 258] input.
 *
 * - For 60 or more frames: uniformly sample 60 frames.
 * - For fewer than 60 frames: retain frames and append zero frames.
 */
export function buildModelSequence(
  processedFrames: number[][],
): number[][] {
  const sequence: number[][] = []

  if (processedFrames.length >= FRAME_COUNT) {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const sourceIndex = Math.floor(
        (i * (processedFrames.length - 1)) / (FRAME_COUNT - 1),
      )

      sequence.push([...processedFrames[sourceIndex]])
    }
  } else {
    for (const frame of processedFrames) {
      sequence.push([...frame])
    }

    while (sequence.length < FRAME_COUNT) {
      sequence.push(zeroFrame())
    }
  }

  if (
    sequence.length !== FRAME_COUNT ||
    sequence.some((frame) => frame.length !== FEATURE_COUNT)
  ) {
    throw new Error('Preprocessing contract violation: invalid sequence shape')
  }

  return sequence
}