import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { LiveRecognitionCamera } from './components/LiveRecognitionCamera'
import type { RecognitionPrediction } from './services/apiClient'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, AudioLines, BookOpen, Check, ChevronLeft, ChevronRight,
  CircleAlert, Copy, Languages, LockKeyhole, Mic, MicOff, RotateCcw, Search, Star,
  ShieldAlert, Volume2, WandSparkles, Hand, MessageSquareText,
  Globe2, Video, HeartHandshake, ScanFace, Settings2, type LucideIcon,
} from 'lucide-react'

import { FeatureLink, PageHeading, Panel, SectionTitle, StatusPill } from './components/Primitives'
import { copyText, createSpeechRecognition, speakText, type SpeechRecognitionLike } from './services/integrations'
import {
  addEmergencyFavorite, addTranslationFavorite, getApiHealth,
  getEmergencyFavorites, getEmergencyPhraseHistory, getLearningProgress,
  getRecognitionApiStatus, getTranslationFavorites, getTranslationHistory,
  recordEmergencyPhrase, removeEmergencyFavorite, removeTranslationFavorite,
  saveLearningProgress, translateMessage,
  type RecognitionApiStatus, type TranslationHistoryItem,
} from './services/apiClient'
import type { AppSettings, SettingsOutletContext } from './settings'

const languages = [
  { name: 'English', local: 'English', locale: 'en-IN' },
  { name: 'Hindi', local: 'हिन्दी', locale: 'hi-IN' },
  { name: 'Telugu', local: 'తెలుగు', locale: 'te-IN' },
  { name: 'Tamil', local: 'தமிழ்', locale: 'ta-IN' },
  { name: 'Kannada', local: 'ಕನ್ನಡ', locale: 'kn-IN' },
]

const featureCards: {
  to: string
  icon: LucideIcon
  title: string
  description: string
  tone: 'blue' | 'teal' | 'coral' | 'mint'
}[] = [
  {
    to: '/recognition',
    icon: Video,
    title: 'ISL recognition',
    description: 'Recognize gestures from the fixed-vocabulary model.',
    tone: 'blue',
  },
  {
    to: '/communication',
    icon: AudioLines,
    title: 'Two-way communication',
    description: 'Combine sign recognition with browser speech transcription.',
    tone: 'teal',
  },
  {
    to: '/emergency',
    icon: ShieldAlert,
    title: 'Emergency mode',
    description: 'Select, copy or speak a clear phrase without a model.',
    tone: 'coral',
  },
  {
    to: '/languages',
    icon: Globe2,
    title: 'Regional languages',
    description: 'Choose a language and prepare text for translation.',
    tone: 'mint',
  },
  {
    to: '/learning',
    icon: BookOpen,
    title: 'ISL learning',
    description: 'Explore a demonstration learning flow.',
    tone: 'blue',
  },
]

const emergencyGroups: Record<string, string[]> = {
  Help: [
    'I need help.',
    'Please help me.',
    'I cannot communicate verbally.',
    'I need immediate assistance.',
    'Please stay with me.',
  ],
  Medical: [
    'Please call an ambulance.',
    'I need a doctor.',
    'I am injured.',
    'I am feeling unwell.',
    'I need my medication.',
    'I need medical attention.',
  ],
  'Personal safety': [
    'I am in danger.',
    'Please take me to a safe place.',
    'Please contact my family.',
    'I need someone to stay with me.',
  ],
  Communication: [
    'I am deaf or hard of hearing.',
    'Please read this message.',
    'Please speak slowly.',
    'I communicate using gestures.',
    'Please help me communicate.',
  ],
}

const emergencyCategories = [...Object.keys(emergencyGroups), 'Favorites']
const phraseStarters = [
  'I need help.',
  'Please speak slowly.',
  'Thank you.',
  'Where is the nearest hospital?',
]

function localeFor(language: string) {
  return languages.find((item) => item.name === language)?.locale ?? 'en-IN'
}

function translationKey(
  item: Pick<
    TranslationHistoryItem,
    'source_text' | 'source_language' | 'target_language' | 'translated_text'
  >,
) {
  return [
    item.source_text,
    item.source_language,
    item.target_language,
    item.translated_text,
  ].join('\u0000')
}

function useCopyFeedback() {
  const [message, setMessage] = useState('')

  async function copy(value: string) {
    const succeeded = await copyText(value)

    setMessage(
      succeeded
        ? 'Copied to clipboard.'
        : 'Clipboard access is unavailable in this browser context.',
    )

    window.setTimeout(() => setMessage(''), 2800)
  }

  return { message, copy }
}

export function HomePage() {
  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-kicker">
            <HeartHandshake size={15} /> ACCESSIBILITY, BUILT AROUND PEOPLE
          </span>

          <h2>
            Every gesture has a voice.
            <br />
            <span>Every voice deserves to be heard.</span>
          </h2>

          <p>
            EchoGesture is an inclusive communication prototype connecting
            Indian Sign Language users with people who do not know sign language.
          </p>

          <Link className="button button-primary" to="/recognition">
            Open recognition workspace <ArrowRight size={17} />
          </Link>
        </div>

        <div className="welcome-art" aria-hidden="true">
          <div className="art-ring art-ring-one" />
          <div className="art-ring art-ring-two" />
          <div className="art-mark">
            <Hand size={62} strokeWidth={1.35} />
          </div>
          <span className="art-caption">A more connected conversation</span>
        </div>
      </section>

      <section className="content-section">
        <SectionTitle
          title="A more accessible conversation"
          detail="Choose a workspace to get started."
        />

        <div className="feature-grid">
          {featureCards.map((feature, index) => (
            <motion.div
              key={feature.to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.045 }}
            >
              <FeatureLink {...feature} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="home-bottom-grid">
        <Panel>
          <SectionTitle
            title="Language roadmap"
            detail="Planned interface languages"
          />

          <div className="language-chip-list">
            {languages.map((language) => (
              <span className="language-chip" key={language.name}>
                <span>{language.local}</span>
                {language.name}
              </span>
            ))}
          </div>

          <p className="panel-footnote">
            Translation availability depends on the configured backend service.
          </p>
        </Panel>

        <Panel className="project-status-panel">
          <SectionTitle
            title="Prototype status"
            detail="A transparent view of what is ready."
          />

          <div className="status-row">
            <StatusPill tone="blue">Fixed-vocabulary prototype</StatusPill>
            <span>77 sentence classes</span>
          </div>

          <div className="status-row">
            <StatusPill tone="teal">Dataset prepared</StatusPill>
            <span>393 selected samples</span>
          </div>

          <div className="status-row">
            <StatusPill>Web APIs</StatusPill>
            <span>Camera and speech depend on browser support</span>
          </div>
        </Panel>
      </section>

      <p className="honesty-note">
        <CircleAlert size={16} />
        EchoGesture is a fixed-vocabulary recognition prototype, not unrestricted
        ISL translation. Recognition results may be incorrect.
      </p>
    </>
  )
}

export function RecognitionPage() {
  const [sentence, setSentence] = useState('')
  const [feedback, setFeedback] = useState('')
  const [recognitionApi, setRecognitionApi] =
    useState<RecognitionApiStatus | null>(null)

  const { settings } = useOutletContext<SettingsOutletContext>()
  const { message, copy } = useCopyFeedback()

  useEffect(() => {
    let active = true

    getRecognitionApiStatus()
      .then((status) => {
        if (active) setRecognitionApi(status)
      })
      .catch(() => {
        if (active) {
          setRecognitionApi({
            available: false,
            reason: 'backend_offline',
            input_shape: [60, 258],
            rejection_threshold: null,
          })
        }
      })

    return () => {
      active = false
    }
  }, [])

  function speak() {
    const started = speakText(
      sentence,
      localeFor(settings.preferredLanguage),
      settings.speechRate,
    )

    setFeedback(
      started
        ? 'Speaking sentence.'
        : 'Text-to-speech is not available in this browser.',
    )
  }

  function handlePrediction(result: RecognitionPrediction) {
    if (result.status === 'accepted' && result.sentence) {
      setSentence(result.sentence)

      setFeedback(
        `Recognized with ${((result.confidence ?? 0) * 100).toFixed(1)}% confidence.`,
      )
    } else {
      setSentence('')

      setFeedback(
        result.rejection_reason ??
          'Sign not confidently recognized. Try again.',
      )
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="CAMERA WORKSPACE"
        title="ISL recognition"
        description="Recognize gestures from the fixed-vocabulary model."
        action={
          <StatusPill
            tone={recognitionApi?.available ? 'teal' : 'coral'}
          >
            {recognitionApi === null
              ? 'CHECKING BACKEND'
              : recognitionApi.available
                ? 'MODEL READY'
                : 'BACKEND UNAVAILABLE'}
          </StatusPill>
        }
      />

      <div className="recognition-grid">
        <Panel className="camera-workspace-panel">
          <SectionTitle
            title="Camera input"
            detail="Grant camera access to recognize gestures."
          />

          <LiveRecognitionCamera onPrediction={handlePrediction} />

          <div className="camera-tips">
            <strong>Camera setup tips</strong>
            <span>
              Keep your hands within the frame, use even lighting, and place
              the camera at a comfortable distance.
            </span>
            <small>
              Recognition depends on camera quality, landmark extraction,
              and model confidence.
            </small>
          </div>

          <div className="privacy-note">
            <LockKeyhole size={15} />
            Camera processing and backend requests depend on the connected
            recognition pipeline.
          </div>
        </Panel>

        <Panel className="recognized-panel">
          <SectionTitle
            title="Recognized sentence"
            detail="Accepted predictions appear here."
          />

          <div className="recognition-output" aria-live="polite">
            {sentence || (
              <span className="muted-copy">No recognition output yet.</span>
            )}
          </div>

          <div className="recognition-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void copy(sentence)}
              disabled={!sentence}
            >
              <Copy size={16} /> Copy
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={speak}
              disabled={!sentence}
            >
              <Volume2 size={16} /> Speak
            </button>

            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setSentence('')
                setFeedback('Output cleared.')
              }}
            >
              <RotateCcw size={16} /> Clear
            </button>
          </div>

          <div className="recognition-unavailable">
            <ScanFace size={19} />

            <div>
              <strong>
                {recognitionApi?.reason === 'backend_offline'
                  ? 'Recognition API is offline'
                  : recognitionApi?.available
                    ? 'Recognition model is available'
                    : 'Recognition is unavailable'}
              </strong>

              <span>
                {recognitionApi?.available
                  ? 'The backend reports that the recognition model is available. Predictions depend on the live camera pipeline.'
                  : `Model status: ${recognitionApi?.reason ?? 'checking'}.`}
              </span>
            </div>
          </div>

          {feedback && (
            <p className="inline-feedback" role="status">
              {feedback}
            </p>
          )}

          {message && (
            <p className="inline-feedback" role="status">
              {message}
            </p>
          )}

          <div className="history-block">
            <SectionTitle
              title="Recent sessions"
              detail="Stored only for this page session."
            />

            <p className="empty-history">No recognition sessions yet.</p>
          </div>
        </Panel>
      </div>
    </>
  )
}

export function CommunicationPage() {
  const { settings } = useOutletContext<SettingsOutletContext>()

  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [recognizedSentence, setRecognizedSentence] = useState('')
  const [recognitionFeedback, setRecognitionFeedback] = useState('')

  const [speechLanguage, setSpeechLanguage] = useState(
    settings.preferredLanguage,
  )

  const [speechRate, setSpeechRate] = useState(settings.speechRate)

  const [speechStatus, setSpeechStatus] = useState(
    'Speech input is ready when your browser supports it.',
  )

  const [listening, setListening] = useState(false)

  const recognizerRef = useRef<SpeechRecognitionLike | null>(null)

  const { message, copy } = useCopyFeedback()

  function handleCommunicationPrediction(result: RecognitionPrediction) {
    if (result.status === 'accepted' && result.sentence) {
      setRecognizedSentence(result.sentence)

      const confidence = ((result.confidence ?? 0) * 100).toFixed(1)

      setRecognitionFeedback(`Confidence: ${confidence}%`)
    } else {
      setRecognizedSentence('')

      setRecognitionFeedback(
        result.rejection_reason ??
          'Sign not confidently recognized. Try again.',
      )
    }
  }

  function speakRecognizedSentence() {
    const started = speakText(
      recognizedSentence,
      localeFor(settings.preferredLanguage),
      settings.speechRate,
    )

    setRecognitionFeedback(
      started
        ? 'Speaking recognized sentence.'
        : 'Text-to-speech is not available in this browser.',
    )
  }

  useEffect(
    () => () => {
      const recognizer = recognizerRef.current

      if (!recognizer) return

      recognizer.onresult = null
      recognizer.onerror = null
      recognizer.onend = null

      recognizer.stop()
      recognizerRef.current = null
    },
    [],
  )

  function startListening() {
    const recognizer = createSpeechRecognition()

    if (!recognizer) {
      setSpeechStatus(
        'Speech recognition is not available in this browser. Browser support and network requirements vary.',
      )
      return
    }

    recognizer.lang = localeFor(speechLanguage)
    recognizer.continuous = true
    recognizer.interimResults = true

    recognizer.onresult = (event) => {
      let finalText = ''
      let interimText = ''

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index]

        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      if (finalText) {
        setTranscript(
          (current) =>
            `${current}${current ? ' ' : ''}${finalText.trim()}`,
        )
      }

      setInterim(interimText)
    }

    recognizer.onerror = (event) => {
      setSpeechStatus(
        event.error === 'not-allowed'
          ? 'Microphone permission was denied.'
          : `Speech input stopped: ${event.error}.`,
      )

      setListening(false)
    }

    recognizer.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognizerRef.current = recognizer

    try {
      recognizer.start()
      setListening(true)

      setSpeechStatus(
        'Listening through your browser. The browser may use an internet service for transcription.',
      )
    } catch {
      setSpeechStatus(
        'Could not start speech recognition. Check microphone permissions and try again.',
      )
    }
  }

  function stopListening() {
    recognizerRef.current?.stop()
    setListening(false)
    setSpeechStatus('Listening stopped.')
  }

  function clearTranscript() {
    setTranscript('')
    setInterim('')
    setSpeechStatus('Transcript cleared.')
  }

  return (
    <>
      <PageHeading
        eyebrow="CONVERSATION TOOLS"
        title="Two-way communication"
        description="Combine sign recognition with browser speech input."
      />

      <div className="two-way-grid">
        <Panel>
          <div className="panel-heading-row">
            <div>
              <span className="panel-step">01 · ISL TO TEXT</span>
              <h2>Sign toward camera</h2>
              <p>Recognized signs appear below.</p>
            </div>

            <span className="round-icon tone-blue">
              <Video size={20} />
            </span>
          </div>

          <LiveRecognitionCamera
            onPrediction={handleCommunicationPrediction}
          />

          <div className="transcript-box">
            <span>Recognized sentence</span>

            <p className="recognition-output" aria-live="polite">
              {recognizedSentence || (
                <span className="muted-copy">
                  No recognition output yet.
                </span>
              )}
            </p>

            {recognitionFeedback && (
              <p className="inline-feedback" role="status">
                {recognitionFeedback}
              </p>
            )}
          </div>

          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void copy(recognizedSentence)}
              disabled={!recognizedSentence}
            >
              <Copy size={16} /> Copy
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={speakRecognizedSentence}
              disabled={!recognizedSentence}
            >
              <Volume2 size={16} /> Speak
            </button>

            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setRecognizedSentence('')
                setRecognitionFeedback('Recognition output cleared.')
              }}
              disabled={!recognizedSentence}
            >
              <RotateCcw size={16} /> Clear
            </button>
          </div>

          {message && (
            <p className="inline-feedback" role="status">
              {message}
            </p>
          )}
        </Panel>

        <Panel>
          <div className="panel-heading-row">
            <div>
              <span className="panel-step panel-step-teal">
                02 · SPEECH TO TEXT
              </span>

              <h2>Speak a message</h2>

              <p>Uses browser speech recognition when available.</p>
            </div>

            <span className="round-icon tone-teal">
              <AudioLines size={20} />
            </span>
          </div>

          <div className="speech-options">
            <label>
              Speech language

              <select
                value={speechLanguage}
                onChange={(event) => setSpeechLanguage(event.target.value)}
              >
                {languages.map((language) => (
                  <option key={language.name}>{language.name}</option>
                ))}
              </select>
            </label>

            <label>
              Playback speed <span>{speechRate.toFixed(1)}×</span>

              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.1"
                value={speechRate}
                onChange={(event) =>
                  setSpeechRate(Number(event.target.value))
                }
              />
            </label>
          </div>

          <div className={`mic-stage ${listening ? 'mic-stage-active' : ''}`}>
            <span className="mic-halo">
              <Mic size={27} />
            </span>

            <strong>
              {listening ? 'Listening now' : 'Ready when you are'}
            </strong>

            <span>{speechStatus}</span>
          </div>

          <div className="button-row">
            {!listening ? (
              <button
                type="button"
                className="button button-primary"
                onClick={startListening}
              >
                <Mic size={16} /> Start listening
              </button>
            ) : (
              <button
                type="button"
                className="button button-danger"
                onClick={stopListening}
              >
                <MicOff size={16} /> Stop listening
              </button>
            )}

            <button
              type="button"
              className="button button-quiet"
              onClick={clearTranscript}
            >
              <RotateCcw size={16} /> Clear
            </button>
          </div>

          <div className="transcript-box transcript-live">
            <label htmlFor="speech-transcript">Speech transcript</label>

            <textarea
              id="speech-transcript"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Your editable transcript will appear here…"
              rows={3}
            />

            <span className="interim-transcript" aria-live="polite">
              {interim}
            </span>
          </div>

          <div className="quick-phrases">
            <span>Quick phrases</span>

            {phraseStarters.slice(0, 3).map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() =>
                  setTranscript(
                    (current) =>
                      `${current}${current ? ' ' : ''}${phrase}`,
                  )
                }
              >
                {phrase}
              </button>
            ))}
          </div>

          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void copy(transcript)}
              disabled={!transcript}
            >
              <Copy size={16} /> Copy transcript
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                const started = speakText(
                  transcript,
                  localeFor(speechLanguage),
                  speechRate,
                )

                setSpeechStatus(
                  started
                    ? 'Speaking transcript.'
                    : 'Text-to-speech is not available in this browser.',
                )
              }}
              disabled={!transcript}
            >
              <Volume2 size={16} /> Speak / repeat
            </button>
          </div>

          {message && (
            <p className="inline-feedback" role="status">
              {message}
            </p>
          )}

          <p className="panel-footnote">
            Speech recognition support, accuracy and network handling are
            controlled by your browser. Review its privacy settings before use.
          </p>
        </Panel>
      </div>
    </>
  )
}

export function EmergencyPage() {
  const [selectedPhrase, setSelectedPhrase] = useState('')
  const [feedback, setFeedback] = useState('')
  const [category, setCategory] = useState('Help')
  const [query, setQuery] = useState('')
  const [customPhrase, setCustomPhrase] = useState('')
  const [recentPhrases, setRecentPhrases] = useState<string[]>([])

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('echogesture.emergency-favorites.v1') ?? '[]',
      ) as string[]
    } catch {
      return []
    }
  })

  const { settings } = useOutletContext<SettingsOutletContext>()
  const { message, copy } = useCopyFeedback()

  const phrases = (
    category === 'Favorites'
      ? favorites
      : emergencyGroups[category] ?? []
  ).filter((phrase) => phrase.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    try {
      localStorage.setItem(
        'echogesture.emergency-favorites.v1',
        JSON.stringify(favorites),
      )
    } catch {
      // Storage may be disabled.
    }
  }, [favorites])

  useEffect(() => {
    let active = true

    getEmergencyFavorites()
      .then((remote) => {
        if (active) {
          setFavorites((current) => [...new Set([...current, ...remote])])
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    getEmergencyPhraseHistory()
      .then((items) => {
        if (active) {
          setRecentPhrases((current) =>
            [
              ...new Set([
                ...current,
                ...items.map((item) => item.phrase),
              ]),
            ].slice(0, 4),
          )
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  function choosePhrase(phrase: string) {
    setSelectedPhrase(phrase)
    setFeedback('')

    setRecentPhrases((recent) =>
      [phrase, ...recent.filter((item) => item !== phrase)].slice(0, 4),
    )

    void recordEmergencyPhrase(phrase).catch(() => undefined)
  }

  function toggleFavorite(phrase: string) {
    const removing = favorites.includes(phrase)

    setFavorites((current) =>
      removing
        ? current.filter((item) => item !== phrase)
        : [...current, phrase],
    )

    void (
      removing
        ? removeEmergencyFavorite(phrase)
        : addEmergencyFavorite(phrase)
    ).catch(() => undefined)
  }

  function speak() {
    const started = speakText(
      selectedPhrase,
      localeFor(settings.preferredLanguage),
      settings.speechRate,
    )

    setFeedback(
      started
        ? 'Speaking selected phrase.'
        : 'Text-to-speech is not available in this browser.',
    )
  }

  return (
    <div className="emergency-page">
      <PageHeading
        eyebrow="MANUAL FALLBACK · ALWAYS AVAILABLE"
        title="Emergency mode"
        description="Choose a phrase to display, copy or speak. No camera, model or account is required."
        action={
          <span className="emergency-label">
            <span /> EMERGENCY TOOL
          </span>
        }
      />

      <div className="emergency-banner">
        <div className="emergency-symbol">
          <ShieldAlert size={25} />
        </div>

        <div>
          <strong>Need to communicate urgently?</strong>
          <span>
            Select the phrase that best fits. The selected message will stay
            large and easy to show.
          </span>
        </div>
      </div>

      <div className="emergency-layout">
        <Panel className="phrase-picker">
          <SectionTitle
            title="Choose a message"
            detail="Tap a phrase to display it."
          />

          <label className="search-field emergency-search">
            <Search size={16} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search phrases"
            />
          </label>

          <div
            className="emergency-categories"
            role="group"
            aria-label="Emergency phrase categories"
          >
            {emergencyCategories.map((item) => (
              <button
                type="button"
                key={item}
                className={
                  category === item
                    ? 'emergency-category active'
                    : 'emergency-category'
                }
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="emergency-phrase-list">
            {phrases.map((phrase) => (
              <div className="emergency-phrase-item" key={phrase}>
                <button
                  type="button"
                  className={`emergency-phrase ${
                    selectedPhrase === phrase ? 'selected' : ''
                  }`}
                  onClick={() => choosePhrase(phrase)}
                >
                  <span>{phrase}</span>
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  className={`favorite-phrase ${
                    favorites.includes(phrase) ? 'is-favorite' : ''
                  }`}
                  onClick={() => toggleFavorite(phrase)}
                  aria-label={`${
                    favorites.includes(phrase) ? 'Remove' : 'Add'
                  } ${phrase} ${
                    favorites.includes(phrase) ? 'from' : 'to'
                  } favorites`}
                  aria-pressed={favorites.includes(phrase)}
                >
                  <Star
                    size={16}
                    fill={favorites.includes(phrase) ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            ))}

            {phrases.length === 0 && (
              <p className="empty-history">
                No phrases match. Try another category or search.
              </p>
            )}
          </div>

          <form
            className="custom-phrase-form"
            onSubmit={(event) => {
              event.preventDefault()

              if (customPhrase.trim()) {
                choosePhrase(customPhrase.trim())
                setCustomPhrase('')
              }
            }}
          >
            <label htmlFor="custom-emergency-phrase">Custom message</label>

            <div>
              <input
                id="custom-emergency-phrase"
                maxLength={160}
                value={customPhrase}
                onChange={(event) => setCustomPhrase(event.target.value)}
                placeholder="Write your own message"
              />

              <button
                className="button button-secondary"
                type="submit"
                disabled={!customPhrase.trim()}
              >
                Use phrase
              </button>
            </div>
          </form>

          {recentPhrases.length > 0 && (
            <div className="recent-phrases">
              <strong>Recently selected</strong>

              {recentPhrases.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => choosePhrase(phrase)}
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="selected-phrase-panel">
          <span className="eyebrow emergency-eyebrow">YOUR MESSAGE</span>

          <div className="selected-phrase" aria-live="polite">
            {selectedPhrase || 'Select a phrase to display it here.'}
          </div>

          <div className="button-row emergency-actions">
            <button
              type="button"
              className="button button-emergency"
              onClick={speak}
              disabled={!selectedPhrase}
            >
              <Volume2 size={18} /> Speak / repeat
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => void copy(selectedPhrase)}
              disabled={!selectedPhrase}
            >
              <Copy size={17} /> Copy
            </button>

            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setSelectedPhrase('')
                setFeedback('Message cleared.')
              }}
              disabled={!selectedPhrase}
            >
              Clear
            </button>
          </div>

          {(feedback || message) && (
            <p className="inline-feedback" role="status">
              {feedback || message}
            </p>
          )}

          <p className="emergency-manual-note">
            <LockKeyhole size={15} />
            This manual phrase board works independently of recognition services.
          </p>
        </Panel>
      </div>
    </div>
  )
}

export function LanguagesPage() {
  const [sourceLanguage, setSourceLanguage] = useState('English')
  const [targetLanguage, setTargetLanguage] = useState('Hindi')
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<TranslationHistoryItem[]>([])

  const [favorites, setFavorites] = useState<TranslationHistoryItem[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('echogesture.translation-favorites.v1') ?? '[]',
      ) as TranslationHistoryItem[]
    } catch {
      return []
    }
  })

  const [translationService, setTranslationService] = useState<
    'checking' | 'available' | 'unavailable' | 'offline'
  >('checking')

  const { settings } = useOutletContext<SettingsOutletContext>()
  const { message, copy } = useCopyFeedback()

  useEffect(() => {
    let active = true

    getApiHealth()
      .then((health) => {
        if (active) setTranslationService(health.translation_service)
      })
      .catch(() => {
        if (active) setTranslationService('offline')
      })

    getTranslationHistory()
      .then((items) => {
        if (active) setHistory(items)
      })
      .catch(() => undefined)

    getTranslationFavorites()
      .then((items) => {
        if (active) {
          setFavorites((current) =>
            [
              ...new Map(
                [...current, ...items].map((item) => [
                  translationKey(item),
                  item,
                ]),
              ).values(),
            ],
          )
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'echogesture.translation-favorites.v1',
        JSON.stringify(favorites),
      )
    } catch {
      // Storage may be disabled.
    }
  }, [favorites])

  function toggleTranslationFavorite(item: TranslationHistoryItem) {
    const removing = favorites.some(
      (favorite) => translationKey(favorite) === translationKey(item),
    )

    setFavorites((current) =>
      removing
        ? current.filter(
            (favorite) => translationKey(favorite) !== translationKey(item),
          )
        : [...current, item],
    )

    void (
      removing
        ? removeTranslationFavorite(item)
        : addTranslationFavorite(item)
    ).catch(() => undefined)
  }

  async function requestTranslation() {
    setBusy(true)
    setStatus('')

    try {
      setTranslatedText(
        await translateMessage(sourceText, sourceLanguage, targetLanguage),
      )

      setStatus('Translation ready.')

      void getTranslationHistory()
        .then(setHistory)
        .catch(() => undefined)
    } catch (error) {
      setTranslatedText('')

      setStatus(
        error instanceof Error
          ? error.message
          : 'Translation is unavailable.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="LANGUAGE ACCESS"
        title="Regional languages"
        description="Prepare a message in English, Hindi, Telugu, Tamil or Kannada."
      />

      <div className="language-selector-grid">
        {languages.map((language) => (
          <button
            type="button"
            key={language.name}
            onClick={() => setTargetLanguage(language.name)}
            className={`language-card ${
              targetLanguage === language.name
                ? 'language-card-selected'
                : ''
            }`}
            aria-pressed={targetLanguage === language.name}
          >
            <span className="language-script">{language.local}</span>
            <strong>{language.name}</strong>
            <span>
              {targetLanguage === language.name
                ? 'Selected target'
                : 'Choose as target'}
            </span>
          </button>
        ))}
      </div>

      <div className="phrase-starters">
        <span>English phrase starters · select to prepare source text</span>

        <div>
          {phraseStarters.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => {
                setSourceLanguage('English')
                setSourceText(phrase)
                setTranslatedText('')
                setStatus('')
              }}
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      <Panel className="translation-panel">
        <div className="translation-toolbar">
          <label>
            From

            <select
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
            >
              {languages.map((language) => (
                <option key={language.name}>{language.name}</option>
              ))}
            </select>
          </label>

          <button
            className="swap-languages"
            type="button"
            onClick={() => {
              setSourceLanguage(targetLanguage)
              setTargetLanguage(sourceLanguage)
              setTranslatedText('')
              setStatus('')
            }}
            aria-label="Swap source and target languages"
          >
            <Languages size={18} />
          </button>

          <label>
            To

            <select
              value={targetLanguage}
              onChange={(event) => {
                setTargetLanguage(event.target.value)
                setTranslatedText('')
                setStatus('')
              }}
            >
              {languages.map((language) => (
                <option key={language.name}>{language.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="translation-columns">
          <label className="translation-field">
            <span>Source text</span>

            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Write a message to prepare for translation…"
              rows={6}
            />

            <span className="field-caption">
              {sourceText.length} characters
            </span>
          </label>

          <div className="translation-result">
            <span>Translated text</span>

            <div className="translation-output" aria-live="polite">
              {translatedText || (
                <span className="muted-copy">
                  A connected translation will appear here.
                </span>
              )}
            </div>

            <span className="field-caption">{targetLanguage}</span>
          </div>
        </div>

        <div className="translation-footer">
          <p className="provider-note">
            <CircleAlert size={16} />

            {translationService === 'available'
              ? 'Translation provider is available through the backend.'
              : translationService === 'offline'
                ? 'Backend is offline. Translation is unavailable.'
                : translationService === 'checking'
                  ? 'Checking translation service…'
                  : 'Translation credentials are not configured. No translation will be fabricated.'}
          </p>

          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              onClick={() => void requestTranslation()}
              disabled={
                !sourceText.trim() ||
                busy ||
                sourceLanguage === targetLanguage
              }
            >
              <WandSparkles size={16} />
              {busy ? 'Preparing…' : 'Translate'}
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => void copy(translatedText)}
              disabled={!translatedText}
            >
              <Copy size={16} /> Copy
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                const started = speakText(
                  translatedText,
                  localeFor(targetLanguage),
                  settings.speechRate,
                )

                setStatus(
                  started
                    ? 'Speaking translated text.'
                    : 'Text-to-speech is not available.',
                )
              }}
              disabled={!translatedText}
            >
              <Volume2 size={16} /> Speak
            </button>
          </div>
        </div>

        {(status || message) && (
          <p className="inline-feedback" role="status">
            {status || message}
          </p>
        )}
      </Panel>

      <Panel className="translation-history">
        <SectionTitle
          title="Translation history"
          detail="Saved translations are stored in the backend database."
        />

        {history.length ? (
          history.slice(0, 5).map((item) => {
            const isFavorite = favorites.some(
              (favorite) => translationKey(favorite) === translationKey(item),
            )

            return (
              <div className="translation-history-row" key={item.id}>
                <div>
                  <strong>
                    {item.source_language} → {item.target_language}
                  </strong>

                  <p>{item.source_text}</p>
                  <span>{item.translated_text}</span>
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => toggleTranslationFavorite(item)}
                    aria-pressed={isFavorite}
                  >
                    <Star
                      size={15}
                      fill={isFavorite ? 'currentColor' : 'none'}
                    />
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </button>

                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => {
                      setSourceText(item.source_text)
                      setSourceLanguage(item.source_language)
                      setTargetLanguage(item.target_language)
                      setTranslatedText(item.translated_text)
                      setStatus('Loaded a saved translation.')
                    }}
                  >
                    Reuse
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="empty-history">
            {translationService === 'offline'
              ? 'Backend history is unavailable while offline.'
              : 'No successful translations have been saved yet.'}
          </p>
        )}

        {favorites.length > 0 && (
          <p className="panel-footnote">
            {favorites.length} saved favorite translation
            {favorites.length === 1 ? '' : 's'}.
          </p>
        )}
      </Panel>

      <p className="panel-footnote language-footnote">
        Language selection changes interface context and speech locale only.
        It does not provide translation on its own.
      </p>
    </>
  )
}

const learningCategories = [
  'All topics',
  'Beginner',
  'Intermediate',
  'Advanced',
  'Favorites',
]

const learningTopics = [
  {
    title: 'Getting started with ISL',
    category: 'Beginner',
    note: 'Orientation outline · resource pending',
    icon: Hand,
  },
  {
    title: 'Everyday communication',
    category: 'Beginner',
    note: 'Vocabulary outline · resource pending',
    icon: MessageSquareText,
  },
  {
    title: 'Handshape awareness',
    category: 'Intermediate',
    note: 'Practice outline · resource pending',
    icon: ScanFace,
  },
  {
    title: 'Observation and reflection',
    category: 'Advanced',
    note: 'Self-guided activity · demonstration',
    icon: Activity,
  },
]

const lessonTitles = [
  'Welcome and orientation',
  'Observe and reflect',
  'Practice check-in',
]

export function LearningPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All topics')
  const [lessonIndex, setLessonIndex] = useState(0)
  const [practiceNote, setPracticeNote] = useState('')

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('echogesture.learning-favorites.v1') ?? '[]',
      ) as string[]
    } catch {
      return []
    }
  })

  useEffect(() => {
    let active = true

    getLearningProgress()
      .then((items) => {
        const current = items.find((item) =>
          item.lesson_id.startsWith('demo-step-'),
        )

        const savedIndex = current
          ? Number(current.lesson_id.replace('demo-step-', '')) - 1
          : -1

        if (
          active &&
          savedIndex >= 0 &&
          savedIndex < lessonTitles.length
        ) {
          setLessonIndex(savedIndex)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'echogesture.learning-favorites.v1',
        JSON.stringify(favorites),
      )
    } catch {
      // Storage may be disabled.
    }
  }, [favorites])

  function moveLesson(index: number) {
    const nextIndex =
      (index + lessonTitles.length) % lessonTitles.length

    setLessonIndex(nextIndex)

    void saveLearningProgress(
      `demo-step-${nextIndex + 1}`,
      nextIndex === lessonTitles.length - 1,
    ).catch(() => undefined)
  }

  const filteredTopics = learningTopics.filter((topic) => {
    const categoryMatches =
      category === 'All topics' ||
      (category === 'Favorites'
        ? favorites.includes(topic.title)
        : topic.category === category)

    return (
      categoryMatches &&
      topic.title.toLowerCase().includes(query.toLowerCase())
    )
  })

  return (
    <>
      <PageHeading
        eyebrow="LEARNING STUDIO"
        title="ISL learning mode"
        description="A structured place for lessons and practice. Verified sign demonstrations are not included yet."
        action={<StatusPill tone="coral">DEMONSTRATION CONTENT</StatusPill>}
      />

      <div className="learning-notice">
        <CircleAlert size={18} />

        <p>
          <strong>Authentic learning resources are not connected.</strong>
          Topic cards and lesson steps below demonstrate the interface only;
          they do not teach or verify ISL signs.
        </p>
      </div>

      <div className="learning-top-grid">
        <Panel className="lesson-panel">
          <SectionTitle
            title="Your learning path"
            detail="A demonstration progression; progress is saved when the backend is available."
          />

          <div className="lesson-progress">
            <span
              style={{
                width: `${((lessonIndex + 1) / lessonTitles.length) * 100}%`,
              }}
            />
          </div>

          <div className="lesson-count">
            STEP {String(lessonIndex + 1).padStart(2, '0')} OF{' '}
            {String(lessonTitles.length).padStart(2, '0')}
          </div>

          <h3>{lessonTitles[lessonIndex]}</h3>

          <p>
            This placeholder lesson contains no verified gesture instruction.
            Curated ISL materials will be added when reviewed resources are
            available.
          </p>

          <div className="button-row">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => moveLesson(lessonIndex - 1)}
              disabled={lessonIndex === 0}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <button
              className="button button-primary"
              type="button"
              onClick={() => moveLesson(lessonIndex + 1)}
            >
              {lessonIndex === lessonTitles.length - 1
                ? 'Restart path'
                : 'Next step'}
              <ChevronRight size={16} />
            </button>
          </div>
        </Panel>

        <Panel className="practice-panel">
          <span className="round-icon tone-teal">
            <ScanFace size={21} />
          </span>

          <h2>Practice workspace</h2>

          <p>
            Landmark feedback will be available only after camera landmark
            extraction and verified learning materials are integrated.
          </p>

          <div className="landmark-placeholder">
            <span>
              <Activity size={18} />
            </span>

            <div>
              <strong>Landmark feedback</strong>
              <small>Not connected</small>
            </div>

            <StatusPill>Planned</StatusPill>
          </div>

          <label className="practice-label" htmlFor="practice-reflection">
            Practice reflection
          </label>

          <textarea
            id="practice-reflection"
            rows={3}
            value={practiceNote}
            onChange={(event) => setPracticeNote(event.target.value)}
            placeholder="Write a note for yourself…"
          />
        </Panel>
      </div>

      <Panel className="dictionary-panel">
        <SectionTitle
          title="Sign dictionary"
          detail="Search demonstration topics; no authentic sign entries are currently available."
        />

        <div className="dictionary-tools">
          <label className="search-field">
            <Search size={17} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics"
            />
          </label>

          <div
            className="filter-tabs"
            role="group"
            aria-label="Filter learning topics"
          >
            {learningCategories.map((item) => (
              <button
                type="button"
                key={item}
                className={
                  category === item
                    ? 'filter-tab filter-tab-active'
                    : 'filter-tab'
                }
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="learning-cards">
          {filteredTopics.map(
            ({ title, category: topicCategory, note, icon: Icon }) => (
              <article className="learning-card" key={title}>
                <div className="learning-card-top">
                  <span className="round-icon tone-blue">
                    <Icon size={20} />
                  </span>

                  <button
                    type="button"
                    className={`favorite-lesson ${
                      favorites.includes(title) ? 'is-favorite' : ''
                    }`}
                    onClick={() =>
                      setFavorites((current) =>
                        current.includes(title)
                          ? current.filter((item) => item !== title)
                          : [...current, title],
                      )
                    }
                    aria-label={`${
                      favorites.includes(title) ? 'Remove' : 'Add'
                    } ${title} ${
                      favorites.includes(title) ? 'from' : 'to'
                    } favorites`}
                    aria-pressed={favorites.includes(title)}
                  >
                    <Star
                      size={15}
                      fill={favorites.includes(title) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>

                <span className="topic-category">{topicCategory}</span>

                <h3>{title}</h3>

                <p>{note}</p>

                <div className="learning-card-footer">
                  <LockKeyhole size={14} /> No verified sign media
                </div>
              </article>
            ),
          )}

          {filteredTopics.length === 0 && (
            <p className="empty-history">No topics match this search.</p>
          )}
        </div>
      </Panel>
    </>
  )
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>

      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  )
}

export function SettingsPage() {
  const { settings, updateSettings } =
    useOutletContext<SettingsOutletContext>()

  function update<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    updateSettings({ ...settings, [key]: value })
  }

  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES"
        title="Settings"
        description="Tune the interface and speech controls for your needs. Preferences stay in this browser."
      />

      <div className="settings-grid">
        <Panel>
          <SectionTitle
            title="Appearance"
            detail="Personalize contrast, theme and accent."
          />

          <div className="setting-choice-group">
            <span className="setting-label">Theme</span>

            <div
              className="theme-options"
              role="group"
              aria-label="Theme preference"
            >
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  type="button"
                  key={theme}
                  className={`theme-option ${
                    settings.theme === theme ? 'theme-option-active' : ''
                  }`}
                  onClick={() => update('theme', theme)}
                  aria-pressed={settings.theme === theme}
                >
                  {theme[0].toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-choice-group">
            <span className="setting-label">Pastel accent</span>

            <div
              className="accent-options"
              role="group"
              aria-label="Pastel accent color"
            >
              {(['lavender', 'rose', 'blue', 'mint', 'peach'] as const).map(
                (accent) => (
                  <button
                    key={accent}
                    type="button"
                    className={`accent-swatch accent-${accent}`}
                    onClick={() => update('accent', accent)}
                    aria-label={`${accent} accent`}
                    aria-pressed={settings.accent === accent}
                  >
                    <span />
                  </button>
                ),
              )}
            </div>
          </div>

          <SettingToggle
            label="High contrast"
            description="Strengthen text and interface boundaries."
            checked={settings.highContrast}
            onChange={() => update('highContrast', !settings.highContrast)}
          />

          <SettingToggle
            label="Larger text"
            description="Increase interface text size."
            checked={settings.largerText}
            onChange={() => update('largerText', !settings.largerText)}
          />

          <SettingToggle
            label="Larger controls"
            description="Increase the size of interactive controls."
            checked={settings.largerControls}
            onChange={() =>
              update('largerControls', !settings.largerControls)
            }
          />

          <SettingToggle
            label="Reduce motion"
            description="Limit transitions and animated effects."
            checked={settings.reducedMotion}
            onChange={() => update('reducedMotion', !settings.reducedMotion)}
          />

          <SettingToggle
            label="Voice assistance"
            description="Announce page changes to assistive technology."
            checked={settings.voiceAssistance}
            onChange={() =>
              update('voiceAssistance', !settings.voiceAssistance)
            }
          />
        </Panel>

        <Panel>
          <SectionTitle
            title="Language and speech"
            detail="Used for voice playback and speech input."
          />

          <label className="form-field">
            <span>Preferred language</span>

            <select
              value={settings.preferredLanguage}
              onChange={(event) =>
                update('preferredLanguage', event.target.value)
              }
            >
              {languages.map((language) => (
                <option key={language.name}>{language.name}</option>
              ))}
            </select>
          </label>

          <label className="form-field speech-rate-field">
            <span>
              Speech rate <strong>{settings.speechRate.toFixed(1)}×</strong>
            </span>

            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.1"
              value={settings.speechRate}
              onChange={(event) =>
                update('speechRate', Number(event.target.value))
              }
            />

            <span className="range-ends">
              <small>Slower</small>
              <small>Faster</small>
            </span>
          </label>

          <div className="settings-callout">
            <Volume2 size={18} />

            <p>
              Voice availability and pronunciation depend on voices installed
              in your browser or operating system.
            </p>
          </div>
        </Panel>

        <Panel className="settings-info-panel">
          <span className="round-icon tone-blue">
            <Settings2 size={20} />
          </span>

          <div>
            <h2>Saved on this device</h2>

            <p>
              These preferences are stored in local browser storage and are
              not sent to a server.
            </p>
          </div>

          <Check size={18} className="settings-check" />
        </Panel>
      </div>
    </>
  )
}

export function AboutPage() {
  const objectives = [
    [
      'Bridge everyday communication',
      'Provide practical tools that help ISL users communicate with people who do not know sign language.',
    ],
    [
      'Keep people in control',
      'Offer visible, manual communication options and clear information about camera and microphone access.',
    ],
    [
      'Build with room to grow',
      'Prepare service boundaries for a trained, fixed-vocabulary model and future language providers.',
    ],
  ]

  const roadmap = [
    'Evaluate the fixed-vocabulary recognition model and document its limitations',
    'Connect the exported model to the browser recognition pipeline',
    'Integrate webcam landmark extraction with the 60 × 258 feature input',
    'Add a verified regional translation provider and reviewed ISL learning materials',
  ]

  return (
    <>
      <PageHeading
        eyebrow="ABOUT THE PROJECT"
        title="Communication should include everyone."
        description="EchoGesture is a prototype exploring accessible communication support for Indian Sign Language."
      />

      <section className="about-intro">
        <span className="about-mark">
          <Activity size={27} />
        </span>

        <div>
          <p className="eyebrow">ECHOGESTURE</p>

          <h2>
            Every gesture has a voice.
            <br />
            <span>Every voice deserves to be heard.</span>
          </h2>

          <p>
            We are building a communication platform that brings sign, speech
            and text into a more inclusive conversation. The current experience
            is a fixed-vocabulary prototype, not unrestricted ISL translation.
          </p>
        </div>
      </section>

      <div className="about-section-grid">
        <Panel>
          <SectionTitle title="The problem" />

          <p className="body-copy">
            Communication barriers can make routine interactions difficult
            when one person uses Indian Sign Language and another does not.
            EchoGesture explores practical digital supports while keeping
            its current limitations visible.
          </p>
        </Panel>

        <Panel>
          <SectionTitle title="Project objectives" />

          <div className="objective-list">
            {objectives.map(([title, detail], index) => (
              <div className="objective-row" key={title}>
                <span>0{index + 1}</span>

                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="about-section-grid about-detail-grid">
        <Panel>
          <SectionTitle
            title="Dataset preparation"
            detail="Prepared fixed-vocabulary dataset"
          />

          <div className="dataset-grid">
            <div>
              <strong>77</strong>
              <span>sentence classes</span>
            </div>

            <div>
              <strong>393</strong>
              <span>selected samples</span>
            </div>

            <div>
              <strong>239</strong>
              <span>training samples</span>
            </div>

            <div>
              <strong>77</strong>
              <span>validation samples</span>
            </div>

            <div>
              <strong>77</strong>
              <span>testing samples</span>
            </div>

            <div>
              <strong>60 × 258</strong>
              <span>feature input shape</span>
            </div>
          </div>

          <p className="panel-footnote">
            Dataset counts describe the prepared data. They do not represent
            recognition accuracy or model performance.
          </p>
        </Panel>

        <Panel>
          <SectionTitle
            title="Technology"
            detail="Current frontend foundation"
          />

          <div className="stack-list">
            {[
              'React',
              'TypeScript',
              'Vite',
              'Tailwind CSS',
              'React Router',
              'Framer Motion',
              'Lucide',
            ].map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>

          <p className="panel-footnote">
            Backend recognition uses the configured model service.
          </p>
        </Panel>
      </div>

      <Panel className="roadmap-panel">
        <SectionTitle
          title="What comes next"
          detail="Development depends on reviewed assets and connected services."
        />

        <ol className="roadmap-list">
          {roadmap.map((item, index) => (
            <li key={item}>
              <span>{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </Panel>
    </>
  )
}