export interface DatasetManifestInfo {
  totalClasses: number
  totalSamples: number
  featureShape: readonly [number, number]
  fpsTarget: number
  channelsBreakdown: {
    name: string
    keypoints: number
    dimensions: number
    features: number
    description: string
  }[]
  splits: {
    split: 'train' | 'val' | 'test'
    name: string
    samples: number
    classesRepresented: number
    description: string
  }[]
  pipelineStages: {
    order: number
    name: string
    technology: string
    status: 'planned' | 'prepared' | 'connected'
    description: string
  }[]
}

export const DATASET_MANIFEST: DatasetManifestInfo = {
  totalClasses: 77,
  totalSamples: 393,
  featureShape: [60, 258],
  fpsTarget: 30,
  channelsBreakdown: [
    {
      name: 'Left Hand Landmarks',
      keypoints: 21,
      dimensions: 3,
      features: 63,
      description: 'x, y, z normalized 3D coordinates for 21 left hand joint landmarks.',
    },
    {
      name: 'Right Hand Landmarks',
      keypoints: 21,
      dimensions: 3,
      features: 63,
      description: 'x, y, z normalized 3D coordinates for 21 right hand joint landmarks.',
    },
    {
      name: 'Upper Body Pose Landmarks',
      keypoints: 33,
      dimensions: 3,
      features: 99,
      description: 'Shoulders, elbows, wrists, hips, and torso orientation keypoints.',
    },
    {
      name: 'Face Mesh Reference Anchors',
      keypoints: 11,
      dimensions: 3,
      features: 33,
      description: 'Mouth, nose, and eyebrow salient spatial anchors for grammatical facial expressions.',
    },
  ],
  splits: [
    {
      split: 'train',
      name: 'Training Split',
      samples: 239,
      classesRepresented: 77,
      description: 'Primary supervised feature sequence training set.',
    },
    {
      split: 'val',
      name: 'Validation Split',
      samples: 77,
      classesRepresented: 77,
      description: 'One sample per class for hyperparameter tuning and model checkpoint selection.',
    },
    {
      split: 'test',
      name: 'Testing Split',
      samples: 77,
      classesRepresented: 77,
      description: 'Holdout test evaluation set (one sample per class) for final generalization scoring.',
    },
  ],
  pipelineStages: [
    {
      order: 1,
      name: 'Webcam Video Feed',
      technology: 'Browser MediaDevices API',
      status: 'connected',
      description: 'Captures user video stream at 30 FPS in 720p/1080p resolution locally on client.',
    },
    {
      order: 2,
      name: 'Hand & Pose Landmark Extraction',
      technology: 'MediaPipe Holistic / Hands & Pose',
      status: 'prepared',
      description: 'Tracks 21 hand joints per hand and 33 upper body landmarks per frame.',
    },
    {
      order: 3,
      name: 'Temporal Sequence Preprocessing',
      technology: 'Sliding Window (60 frames × 258 dims)',
      status: 'prepared',
      description: 'Normalizes wrist anchors, computes bone vectors, and pads/interpolates to 60 timesteps.',
    },
    {
      order: 4,
      name: 'Model Inference',
      technology: 'ONNX Runtime Web (WebGPU / WASM)',
      status: 'prepared',
      description: 'Runs lightweight Transformer / BiLSTM ONNX model locally in client browser.',
    },
    {
      order: 5,
      name: 'Classification & Mapping',
      technology: 'Softmax + 77-Class Index Lookup',
      status: 'prepared',
      description: 'Maps argmax prediction to verified English sentence with rejection threshold.',
    },
    {
      order: 6,
      name: 'Assistive Speech & Text Output',
      technology: 'Web Speech Synthesis API',
      status: 'connected',
      description: 'Emits crystal-clear spoken audio in chosen regional accent and copies text.',
    },
  ],
}
