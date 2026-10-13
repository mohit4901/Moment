from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from ..services.google_translate_service import translate_with_google_cloud

router = APIRouter(prefix="/api/translate", tags=["Multilingual & Google Cloud Translation"])

class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text string to translate")
    target_lang: str = Field("hi", description="Target Indic language code (e.g. hi, bn, te, mr, ta, gu, kn, ml, pa, or, as, ur)")
    source_lang: Optional[str] = Field("en", description="Source language code")

class TranslateResponse(BaseModel):
    translated_text: str
    provider: str
    target_lang: str
    source_lang: Optional[str] = None

@router.post("", response_model=TranslateResponse, summary="Translate text via Google Cloud Translation API")
def translate_text(req: TranslateRequest):
    """
    Translates bedside clinical observations, doctor notes, or UI labels using Google Cloud Translation API.
    Falls back gracefully to high-speed Indic LLM if an API key is not yet configured in .env.
    """
    result = translate_with_google_cloud(
        text=req.text,
        target_lang=req.target_lang,
        source_lang=req.source_lang
    )
    return TranslateResponse(**result)
