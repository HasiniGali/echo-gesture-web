import type { LearningLesson } from '../types/learning'

export const LEARNING_LESSONS: LearningLesson[] = [
  {
    id: 'lesson-1',
    title: 'Foundations: Camera Framing & Posture',
    category: 'Foundations',
    description: 'Learn optimal body framing, lighting, and upper-body orientation for reliable sign visibility.',
    focus: 'Signing Space & Lighting',
    durationMinutes: 5,
    targetClasses: ['isl-01', 'isl-06'],
    steps: [
      {
        instruction: 'Position your device at chest height, roughly arm-length (60–90 cm) away.',
        note: 'Ensures both hands, wrists, shoulders, and face remain inside the camera frame.',
      },
      {
        instruction: 'Face a steady, indirect light source. Avoid bright windows behind you.',
        note: 'High backlight prevents landmark extraction algorithms from detecting joint contours.',
      },
      {
        instruction: 'Maintain a relaxed, upright posture with elbows slightly bent at your sides.',
        note: 'This creates the neutral reference baseline for spatial hand coordinates.',
      },
    ],
  },
  {
    id: 'lesson-2',
    title: 'Essential Greetings & Courtesy',
    category: 'Everyday',
    description: 'Explore the flow of common Indian Sign Language greeting sequences and mutual pleasantries.',
    focus: 'Two-Hand Coordination',
    durationMinutes: 8,
    targetClasses: ['isl-01', 'isl-03', 'isl-08', 'isl-11'],
    steps: [
      {
        instruction: 'Observe the trajectory for "Hello, good morning" (palms forward moving gently upward).',
        note: 'Notice the smooth transition between open palms and directional emphasis.',
      },
      {
        instruction: 'Practice "Nice to meet you" by bringing open palm anchors forward with a slight nod.',
        note: 'Facial expressions are integral to ISL grammar and polite tone.',
      },
      {
        instruction: 'Conclude with "Thank you very much" using open dominant hand moving outward from chin.',
        note: 'Maintain steady speed across the 60-frame capture duration.',
      },
    ],
  },
  {
    id: 'lesson-3',
    title: 'Critical Emergency & Assistance Signals',
    category: 'Emergency',
    description: 'Familiarize yourself with urgent help gestures and clear distress signaling.',
    focus: 'Urgent Signaling & Clarity',
    durationMinutes: 10,
    targetClasses: ['isl-13', 'isl-14', 'isl-15', 'isl-23'],
    steps: [
      {
        instruction: 'Notice the clear two-handed alert sequence for "I need urgent help".',
        note: 'Keep movements distinct and deliberate to prevent ambiguous classification.',
      },
      {
        instruction: 'Study the gesture sequence for "Please call an ambulance immediately".',
        note: 'High-contrast gestures ensure rapid recognition even in stressful contexts.',
      },
      {
        instruction: 'Practice the request "Please write on paper for me" as a fallback mechanism.',
        note: 'Empowers deaf individuals when digital assistance is unavailable.',
      },
    ],
  },
  {
    id: 'lesson-4',
    title: 'Daily Needs & Navigation Inquiries',
    category: 'Everyday',
    description: 'Learn sequence structures for requesting water, food, restrooms, and travel guidance.',
    focus: 'Spatial Direction & Indexing',
    durationMinutes: 7,
    targetClasses: ['isl-27', 'isl-29', 'isl-30', 'isl-67'],
    steps: [
      {
        instruction: 'Practice requesting water with cupped dominant hand toward mouth.',
        note: 'Fundamental physiological sign recognized universally across ISL dialects.',
      },
      {
        instruction: 'Signal "Where is the restroom?" with a gentle wrist shake.',
        note: 'Clear question facial expression (slightly raised eyebrows) accompanies the sign.',
      },
      {
        instruction: 'Review directional signs for "Where is the railway station?".',
        note: 'Locational signs rely on pointing and clear transit iconography.',
      },
    ],
  },
]
