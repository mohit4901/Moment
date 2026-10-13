import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { INDIAN_LANGUAGES, CLINICAL_I18N } from './languages';

// Build structured i18next resources for all 23 languages
const resources = {};

INDIAN_LANGUAGES.forEach(lang => {
  resources[lang.code] = {
    translation: {
      lang_name: lang.name,
      lang_native: lang.nativeName,
      lang_region: lang.region,
      lang_sample: lang.sampleGreeting,
    }
  };
});

// Map all clinical translation keys into i18next namespace
Object.keys(CLINICAL_I18N).forEach(key => {
  const translations = CLINICAL_I18N[key];
  INDIAN_LANGUAGES.forEach(lang => {
    const val = translations[lang.code] || translations['hi'] || translations['en'] || key;
    resources[lang.code].translation[key] = val;
  });
});

// Extended bedside & system terms
const COMMON_STRINGS = {
  welcome: {
    en: 'MOMENT - Maternal Safety Platform',
    hi: 'मोमेंट - मातृ सुरक्षा प्लेटफॉर्म',
    bn: 'মোমেন্ট - মাতৃ সুরক্ষা প্ল্যাটফর্ম',
    te: 'మోమెంట్ - మాతృ రక్షణ వేదిక',
    mr: 'मोमेंट - माता सुरक्षा मंच',
    ta: 'மோமென்ட் - தாய்மை பாதுகாப்பு தளம்',
  },
  login: {
    en: 'Login',
    hi: 'लॉगिन',
    bn: 'লগইন',
    te: 'లాగిన్',
    mr: 'लॉगिन',
    ta: 'உள்நுழைக',
  },
  emergency_protocol: {
    en: 'Open Emergency Protocol',
    hi: 'आपातकालीन प्रोटोकॉल खोलें',
    bn: 'জরুরি প্রোটোকল খুলুন',
    te: 'అత్యవసర ప్రోటోకాల్ తెరవండి',
    mr: 'आपत्कालीन प्रोटोकॉल उघडा',
    ta: 'அவசர நெறிமுறையைத் திறக்கவும்',
  },
  select_language: {
    en: 'Select Regional Language (22+ Indic)',
    hi: 'क्षेत्रीय भाषा चुनें (22+ भारतीय भाषाएं)',
    bn: 'আঞ্চলিক ভাষা নির্বাচন করুন (২২+ ভারতীয় ভাষা)',
    te: 'ప్రాంతీయ భాషను ఎంచుకోండి (22+ భారతీయ భాషలు)',
    mr: 'प्रादेशिक भाषा निवडा (२२+ भारतीय भाषा)',
    ta: 'பிராந்திய மொழியைத் தேர்ந்தெடுக்கவும் (22+ இந்திய மொழிகள்)',
  }
};

Object.keys(COMMON_STRINGS).forEach(key => {
  const translations = COMMON_STRINGS[key];
  INDIAN_LANGUAGES.forEach(lang => {
    const val = translations[lang.code] || translations['hi'] || translations['en'] || key;
    resources[lang.code].translation[key] = val;
  });
});

const savedLang = (typeof window !== 'undefined' && localStorage.getItem('moment_lang')) || 'hi';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

// Keep localStorage in sync whenever i18next changes language
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('moment_lang', lng);
  }
});

export default i18n;
