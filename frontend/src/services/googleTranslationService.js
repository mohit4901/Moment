/**
 * Google Cloud Translation & i18next Hybrid Translation Service
 * =============================================================
 * Translates clinical text, dynamic patient notes, or UI labels using:
 * 1. Google Cloud Translation API (via backend /api/translate)
 * 2. i18next local cache & fallback
 */
import i18n from '../i18n/i18n';

/**
 * Translates arbitrary text to the target Indian language.
 *
 * @param {string} text - The input text to translate.
 * @param {string} targetLang - The target Indic language code (e.g. 'bn', 'hi', 'te').
 * @param {string} [sourceLang='en'] - Source language code.
 * @returns {Promise<string>} Translated text.
 */
export async function translateText(text, targetLang = 'hi', sourceLang = 'en') {
  if (!text || !text.trim()) return '';

  // 1. If i18next already has an exact match in resource translations, return instantly
  if (i18n.exists(text, { lng: targetLang })) {
    return i18n.t(text, { lng: targetLang });
  }

  // 2. Query Google Cloud Translation backend endpoint
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_lang: targetLang,
        source_lang: sourceLang
      })
    });

    if (res.ok) {
      const data = await res.json();
      return data.translated_text || text;
    }
  } catch (err) {
    console.warn('Google Cloud Translation network note:', err);
  }

  // 3. Fallback to original text if offline
  return text;
}

export default {
  translateText
};
