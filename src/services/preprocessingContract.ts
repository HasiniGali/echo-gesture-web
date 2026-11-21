/**
 * EchoGesture preprocessing contract
 *
 * Model input:
 *   60 frames × 258 features
 *
 * Feature layout:
 *   Pose:      33 landmarks × [x, y, z, visibility] = 132
 *   Left hand: 21 landmarks × [x, y, z]             = 63
 *   Right hand:21 landmarks × [x, y, z]             = 63
 *   Total: 258
 *
 * Pose normalization:
 *   - Center XYZ using shoulder midpoint.
 *   - Scale XYZ using 3D shoulder distance.
 *   - Preserve visibility values unchanged.
 *
 * Missing landmarks:
 *   - Missing pose -> zero pose features.
 *   - Missing hands -> zero hand features.
 */

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandLandmark3D {
  x: number;
  y: number;
  z: number;
}

export interface LandmarkFrame {
  pose: Landmark3D[] | null;
  leftHand: HandLandmark3D[] | null;
  rightHand: HandLandmark3D[] | null;
}

const POSE_LANDMARK_COUNT = 33;
const HAND_LANDMARK_COUNT = 21;
const FRAME_FEATURE_COUNT = 258;
const MODEL_FRAME_COUNT = 60;

function isValidNumber(value: number): boolean {
  return Number.isFinite(value);
}

function zeroes(length: number): number[] {
  return new Array<number>(length).fill(0);
}

/**
 * Converts one landmark frame into the model's 258-feature layout.
 */
export function preprocessFrame(frame: LandmarkFrame): number[] {
  const output: number[] = [];

  // --------------------------------------------------
  // Pose: 33 landmarks × [x, y, z, visibility]
  // --------------------------------------------------

  const pose = frame.pose;

  if (!pose || pose.length !== POSE_LANDMARK_COUNT) {
    output.push(...zeroes(POSE_LANDMARK_COUNT * 4));
  } else {
    const leftShoulder = pose[11];
    const rightShoulder = pose[12];

    const validShoulders =
      leftShoulder &&
      rightShoulder &&
      isValidNumber(leftShoulder.x) &&
      isValidNumber(leftShoulder.y) &&
      isValidNumber(leftShoulder.z) &&
      isValidNumber(rightShoulder.x) &&
      isValidNumber(rightShoulder.y) &&
      isValidNumber(rightShoulder.z);

    if (!validShoulders) {
      output.push(...zeroes(POSE_LANDMARK_COUNT * 4));
    } else {
      const centerX = (leftShoulder.x + rightShoulder.x) / 2;
      const centerY = (leftShoulder.y + rightShoulder.y) / 2;
      const centerZ = (leftShoulder.z + rightShoulder.z) / 2;

      const dx = leftShoulder.x - rightShoulder.x;
      const dy = leftShoulder.y - rightShoulder.y;
      const dz = leftShoulder.z - rightShoulder.z;

      const shoulderDistance = Math.sqrt(
        dx * dx + dy * dy + dz * dz,
      );

      const scale =
        Number.isFinite(shoulderDistance) && shoulderDistance > 1e-8
          ? shoulderDistance
          : 1;

      for (const landmark of pose) {
        output.push(
          (landmark.x - centerX) / scale,
          (landmark.y - centerY) / scale,
          (landmark.z - centerZ) / scale,
          landmark.visibility ?? 0,
        );
      }
    }
  }

  // --------------------------------------------------
  // Left hand: 21 landmarks × [x, y, z]
  // --------------------------------------------------

  appendHandFeatures(output, frame.leftHand);

  // --------------------------------------------------
  // Right hand: 21 landmarks × [x, y, z]
  // --------------------------------------------------

  appendHandFeatures(output, frame.rightHand);

  if (output.length !== FRAME_FEATURE_COUNT) {
    throw new Error(
      `Preprocessing error: expected ${FRAME_FEATURE_COUNT} features, got ${output.length}`,
    );
  }

  return output;
}

function appendHandFeatures(
  output: number[],
  hand: HandLandmark3D[] | null,
): void {
  if (!hand || hand.length !== HAND_LANDMARK_COUNT) {
    output.push(...zeroes(HAND_LANDMARK_COUNT * 3));
    return;
  }

  for (const landmark of hand) {
    output.push(
      isValidNumber(landmark.x) ? landmark.x : 0,
      isValidNumber(landmark.y) ? landmark.y : 0,
      isValidNumber(landmark.z) ? landmark.z : 0,
    );
  }
}

/**
 * Converts captured frames into the model's fixed 60-frame sequence.
 *
 * If more than 60 frames are available, samples 60 frames evenly.
 * If fewer than 60 frames are available, pads the end with zero frames.
 */
export function buildModelSequence(
  frames: LandmarkFrame[],
): number[][] {
  const zeroFrame = zeroes(FRAME_FEATURE_COUNT);

  if (frames.length === 0) {
    return Array.from(
      { length: MODEL_FRAME_COUNT },
      () => [...zeroFrame],
    );
  }

  let selectedFrames: LandmarkFrame[];

  if (frames.length >= MODEL_FRAME_COUNT) {
    selectedFrames = [];

    for (let i = 0; i < MODEL_FRAME_COUNT; i++) {
      const index = Math.round(
        (i * (frames.length - 1)) / (MODEL_FRAME_COUNT - 1),
      );

      selectedFrames.push(frames[index]);
    }
  } else {
    selectedFrames = [...frames];
  }

  const sequence = selectedFrames.map(preprocessFrame);

  while (sequence.length < MODEL_FRAME_COUNT) {
    sequence.push([...zeroFrame]);
  }

  if (
    sequence.length !== MODEL_FRAME_COUNT ||
    sequence.some((frame) => frame.length !== FRAME_FEATURE_COUNT)
  ) {
    throw new Error("Invalid model sequence shape.");
  }

  return sequence;
}