export interface LanguageConfig {
  code: string
  name: string
  localName: string
  locale: string
  scriptName: string
  sampleText: string
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    localName: 'English',
    locale: 'en-IN',
    scriptName: 'Latin',
    sampleText: 'Every gesture has a voice. Every voice deserves to be heard.',
  },
  {
    code: 'hi',
    name: 'Hindi',
    localName: 'हिन्दी',
    locale: 'hi-IN',
    scriptName: 'Devanagari',
    sampleText: 'हर इशारे की एक आवाज़ होती है। हर आवाज़ सुनी जानी चाहिए।',
  },
  {
    code: 'te',
    name: 'Telugu',
    localName: 'తెలుగు',
    locale: 'te-IN',
    scriptName: 'Telugu',
    sampleText: 'ప్రతి సైగకూ ఒక స్వరం ఉంది. ప్రతి స్వరం వినబడాలి.',
  },
  {
    code: 'ta',
    name: 'Tamil',
    localName: 'தமிழ்',
    locale: 'ta-IN',
    scriptName: 'Tamil',
    sampleText: 'ஒவ்வொரு சைகைக்கும் ஒரு குரல் உண்டு. ஒவ்வொரு குரலும் கேட்கப்பட வேண்டும்.',
  },
  {
    code: 'kn',
    name: 'Kannada',
    localName: 'ಕನ್ನಡ',
    locale: 'kn-IN',
    scriptName: 'Kannada',
    sampleText: 'ಪ್ರತಿಯೊಂದು ಸನ್ನೆಗೂ ಒಂದು ಧ್ವನಿ ಇದೆ. ಪ್ರತಿಯೊಂದು ಧ್ವನಿಯೂ ಕೇಳಿಬರಬೇಕು.',
  },
]

export interface VerifiedPhrasePair {
  english: string
  hindi: string
  telugu: string
  tamil: string
  kannada: string
  category: string
}

// Curated verified standard emergency and accessibility phrases
export const VERIFIED_PHRASES: VerifiedPhrasePair[] = [
  {
    category: 'Essential',
    english: 'Hello, I use sign language to communicate.',
    hindi: 'नमस्ते, मैं बातचीत के लिए सांकेतिक भाषा का उपयोग करता हूँ।',
    telugu: 'నమస్కారం, నేను సంభాషించడానికి సంజ్ఞ భాషను ఉపయోగిస్తాను.',
    tamil: 'வணக்கம், நான் உரையாட சைகை மொழியைப் பயன்படுத்துகிறேன்.',
    kannada: 'ನಮಸ್ಕಾರ, ನಾನು ಸಂವಹನಕ್ಕಾಗಿ ಸನ್ನೆ ಭಾಷೆಯನ್ನು ಬಳಸುತ್ತೇನೆ.',
  },
  {
    category: 'Emergency',
    english: 'Please call an ambulance immediately.',
    hindi: 'कृपया तुरंत एम्बुलेंस बुलाएं।',
    telugu: 'దయచేసి వెంటనే అంబులెన్స్ పిలవండి.',
    tamil: 'தயவுசெய்து உடனடியாக ஆம்புலன்ஸை அழைக்கவும்.',
    kannada: 'ದಯವಿಟ್ಟು ತಕ್ಷಣ ಆಂಬ್ಯುಲೆನ್ಸ್ ಕರೆ ಮಾಡಿ.',
  },
  {
    category: 'Medical',
    english: 'I need to see a doctor.',
    hindi: 'मुझे डॉक्टर से मिलना है।',
    telugu: 'నాకు డాక్టర్ కావాలి.',
    tamil: 'எனக்கு ஒரு மருத்துவர் தேவை.',
    kannada: 'ನಾನು ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಬೇಕು.',
  },
  {
    category: 'Assistance',
    english: 'Could you please write down your message?',
    hindi: 'क्या आप कृपया अपना संदेश लिख सकते हैं?',
    telugu: 'దయచేసి మీ సందేశాన్ని రాసివ్వగలరా?',
    tamil: 'தயவுசெய்து உங்கள் செய்தியை எழுதித் தர முடியுமா?',
    kannada: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಬರೆದು ಕೊಡುತ್ತೀರಾ?',
  },
  {
    category: 'Transit',
    english: 'Where is the nearest railway station?',
    hindi: 'निकटतम रेलवे स्टेशन कहाँ है?',
    telugu: 'సమీపంలోని రైల్వే స్టేషన్ ఎక్కడ ఉంది?',
    tamil: 'அருகிலுள்ள ரயில் நிலையம் எங்கே இருக்கிறது?',
    kannada: 'ಹತ್ತಿರದ ರೈಲ್ವೆ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?',
  },
  {
    category: 'Gratitude',
    english: 'Thank you very much for your understanding.',
    hindi: 'आपकी समझ के लिए बहुत-बहुत धन्यवाद।',
    telugu: 'మీ అవగాహనకు చాలా ధన్యవాదాలు.',
    tamil: 'உங்கள் புரிதலுக்கு மிக்க நன்றி.',
    kannada: 'ನಿಮ್ಮ ತಿಳುವಳಿಕೆಗೆ ತುಂಬಾ ಧನ್ಯವಾದಗಳು.',
  },
]
