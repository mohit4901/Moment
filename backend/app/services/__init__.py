"""
Services Package for MOMENT.
Uses PEP 562 lazy attribute loading so services can be imported without
unnecessary dependency cascades.
"""

def __getattr__(name):
    if name in ("ModelService", "get_model_service"):
        from .model_service import ModelService, get_model_service
        return ModelService if name == "ModelService" else get_model_service
    elif name in ("ShockIndexService", "get_shock_service"):
        from .shock_service import ShockIndexService, get_shock_service
        return ShockIndexService if name == "ShockIndexService" else get_shock_service
    elif name in ("VisionService", "get_vision_service"):
        from .vision_service import VisionService, get_vision_service
        return VisionService if name == "VisionService" else get_vision_service
    elif name == "get_sample_patients":
        from .samples_service import get_sample_patients
        return get_sample_patients
    elif name in (
        "generate_full_clinical_analysis",
        "assess_anemia",
        "calculate_blood_volume_analysis",
        "generate_emergency_protocol",
        "generate_preparedness_checklist",
        "generate_monitoring_schedule",
        "build_risk_explanations",
        "analyze_risk_interactions",
    ):
        import app.services.clinical_engine as ce
        return getattr(ce, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "ModelService",
    "get_model_service",
    "ShockIndexService",
    "get_shock_service",
    "VisionService",
    "get_vision_service",
    "get_sample_patients",
    "generate_full_clinical_analysis",
    "assess_anemia",
    "calculate_blood_volume_analysis",
    "generate_emergency_protocol",
    "generate_preparedness_checklist",
    "generate_monitoring_schedule",
    "build_risk_explanations",
    "analyze_risk_interactions",
]
