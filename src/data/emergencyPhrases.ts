export interface EmergencyPhraseItem {
  id: string
  phrase: string
  hindiTranslation: string
  teluguTranslation: string
  tamilTranslation: string
  kannadaTranslation: string
  priority: 'critical' | 'high' | 'standard'
  actionHint: string
}

export const EMERGENCY_PHRASES: EmergencyPhraseItem[] = [
  {
    id: 'em-1',
    phrase: 'I need help.',
    hindiTranslation: 'मुझे मदद चाहिए।',
    teluguTranslation: 'నాకు సహాయం కావాలి.',
    tamilTranslation: 'எனக்கு உதவி தேவை.',
    kannadaTranslation: 'ನನಗೆ ಸಹಾಯ ಬೇಕು.',
    priority: 'high',
    actionHint: 'General distress call for immediate attention.',
  },
  {
    id: 'em-2',
    phrase: 'Please call an ambulance.',
    hindiTranslation: 'कृपया एम्बुलेंस बुलाएं।',
    teluguTranslation: 'దయచేసి అంబులెన్స్ పిలవండి.',
    tamilTranslation: 'தயவுசெய்து ஆம்புலன்ஸை அழைக்கவும்.',
    kannadaTranslation: 'ದಯವಿಟ್ಟು ಆಂಬ್ಯುಲೆನ್ಸ್ ಕರೆ ಮಾಡಿ.',
    priority: 'critical',
    actionHint: 'Medical emergency requiring 108 / 112 paramedic dispatch.',
  },
  {
    id: 'em-3',
    phrase: 'I need a doctor.',
    hindiTranslation: 'मुझे डॉक्टर की आवश्यकता है।',
    teluguTranslation: 'నాకు డాక్టర్ కావాలి.',
    tamilTranslation: 'எனக்கு ஒரு மருத்துவர் தேவை.',
    kannadaTranslation: 'ನನಗೆ ವೈದ್ಯರ ಅಗತ್ಯವಿದೆ.',
    priority: 'critical',
    actionHint: 'Clinical consultation required at hospital or clinic.',
  },
  {
    id: 'em-4',
    phrase: 'I am injured.',
    hindiTranslation: 'मैं घायल हूँ।',
    teluguTranslation: 'నేను గాయపడ్డాను.',
    tamilTranslation: 'நான் காயமடைந்துள்ளேன்.',
    kannadaTranslation: 'ನಾನು ಗಾಯಗೊಂಡಿದ್ದೇನೆ.',
    priority: 'critical',
    actionHint: 'Physical trauma or wound requiring first aid.',
  },
  {
    id: 'em-5',
    phrase: 'I need immediate assistance.',
    hindiTranslation: 'मुझे तत्काल सहायता की आवश्यकता है।',
    teluguTranslation: 'నాకు తక్షణ సహాయం కావాలి.',
    tamilTranslation: 'எனக்கு உடனடி உதவி தேவை.',
    kannadaTranslation: 'ನನಗೆ ತಕ್ಷಣದ ಸಹಾಯ ಬೇಕು.',
    priority: 'high',
    actionHint: 'Urgent bystander or security personnel intervention.',
  },
  {
    id: 'em-6',
    phrase: 'Please contact my family.',
    hindiTranslation: 'कृपया मेरे परिवार से संपर्क करें।',
    teluguTranslation: 'దయచేసి నా కుటుంబాన్ని సంప్రదించండి.',
    tamilTranslation: 'தயவுசெய்து என் குடும்பத்தினரை தொடர்பு கொள்ளவும்.',
    kannadaTranslation: 'ದಯವಿಟ್ಟು ನನ್ನ ಕುಟುಂಬವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    priority: 'high',
    actionHint: 'Notification to relatives or primary emergency contact.',
  },
  {
    id: 'em-7',
    phrase: 'I cannot communicate verbally.',
    hindiTranslation: 'मैं मौखिक रूप से बातचीत नहीं कर सकता।',
    teluguTranslation: 'నేను నోటితో మాట్లాడలేను.',
    tamilTranslation: 'என்னால் வாய்மொழியாக பேச முடியாது.',
    kannadaTranslation: 'ನಾನು ಮೌಖಿಕವಾಗಿ ಸಂವಹನ ನಡೆಸಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    priority: 'standard',
    actionHint: 'Informs responder to use written text, gestures, or visual cues.',
  },
]
