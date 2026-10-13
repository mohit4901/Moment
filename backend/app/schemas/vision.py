from pydantic import BaseModel
from typing import Dict, Optional, Any

class VisionTriageResponse(BaseModel):
    filename: str
    predicted_class: str
    triage_tier: Optional[str] = None
    classification: Optional[str] = None
    confidence: float
    confidence_percentage: str
    class_probabilities: Dict[str, float]
    triage_badge: str
    triage_color: str
    clinical_recommendation: str
    clinical_action: Optional[str] = None
    is_critical: bool
    
    # OpenCV Quantitative Computer Vision Metrics
    estimated_blood_loss_ml: float
    blood_loss_range: str
    saturation_percentage: float
    blood_pixels: int
    pad_pixels: int
    lochia_type: str
    bleeding_severity: str = "Routine"
    opencv_detection_success: bool = True
    annotated_image_base64: Optional[str] = None
    image_quality: Optional[Dict[str, Any]] = None
    explanation: Optional[Dict[str, Any]] = None
    
    disclaimer: str = "Experimental dual-engine (ResNet-50 + OpenCV) triage prototype for clinical decision support. Confirm visually and correlate with patient vitals."
