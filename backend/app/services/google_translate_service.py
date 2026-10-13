import os
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional

GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "")

# ISO-639-1 / BCP-47 mapping for Google Cloud Translation
GOOGLE_LANG_MAP = {
    "hi": "hi",
    "en": "en",
    "bn": "bn",
    "te": "te",
    "mr": "mr",
    "ta": "ta",
    "gu": "gu",
    "kn": "kn",
    "ml": "ml",
    "or": "or",
    "pa": "pa",
    "as": "as",
    "ur": "ur",
    "mai": "mai",
    "sat": "sat",
    "ks": "ks",
    "ne": "ne",
    "kok": "kok",
    "sd": "sd",
    "doi": "doi",
    "mni": "mni",
    "brx": "brx",
    "sa": "sa"
}

def translate_with_google_cloud(
    text: str,
    target_lang: str = "hi",
    source_lang: Optional[str] = "en"
) -> Dict[str, Any]:
    """
    Translates text using Google Cloud Translation API v2 or falls back gracefully
    to the active LLM translation engine if an API key is not configured.
    """
    if not text or not text.strip():
        return {"translated_text": "", "provider": "none", "target_lang": target_lang}

    target_code = GOOGLE_LANG_MAP.get(target_lang, target_lang)

    # 1. Attempt official Google Cloud Translation REST API
    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY") or os.getenv("GOOGLE_CLOUD_API_KEY")
    if api_key:
        try:
            url = f"https://translation.googleapis.com/language/translate/v2?key={api_key}"
            payload = {
                "q": text,
                "target": target_code,
                "format": "text"
            }
            if source_lang:
                payload["source"] = source_lang

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read().decode("utf-8"))
                translations = result.get("data", {}).get("translations", [])
                if translations:
                    return {
                        "translated_text": translations[0].get("translatedText", text),
                        "provider": "google_cloud_translation_api",
                        "target_lang": target_lang,
                        "source_lang": translations[0].get("detectedSourceLanguage", source_lang or "auto")
                    }
        except Exception as e:
            print(f"⚠️ Google Cloud Translation API error: {e}, falling back to clinical intelligence...")

    # 2. Fallback: Rapid LLM Indic Translation via Groq / Nemotron
    try:
        from .explanation_service import get_explanation_service
        llm = get_explanation_service()
        prompt = (
            f"Translate the following clinical text into Indian language '{target_lang}'. "
            f"Only return the raw translated string with zero preamble, no markdown, and preserve medical accuracy.\n\n"
            f"Text: {text}"
        )
        if llm.client:
            res = llm.client.chat.completions.create(
                model=llm.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.1
            )
            translated = res.choices[0].message.content.strip()
            return {
                "translated_text": translated,
                "provider": "llm_groq_nemotron_translation",
                "target_lang": target_lang,
                "source_lang": source_lang or "en"
            }
    except Exception as e:
        print(f"⚠️ LLM translation fallback note: {e}")

    # 3. Echo text if unavailable
    return {
        "translated_text": text,
        "provider": "raw_echo",
        "target_lang": target_lang,
        "source_lang": source_lang or "en"
    }
