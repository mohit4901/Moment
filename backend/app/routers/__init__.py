"""
FastAPI Routers Package for MOMENT.
Uses PEP 562 lazy attribute loading so routers can be imported without
unnecessary dependency cascades.
"""

def __getattr__(name):
    if name == "predict_router":
        from .predict import router
        return router
    elif name == "vitals_router":
        from .vitals import router
        return router
    elif name == "vision_router":
        from .vision import router
        return router
    elif name == "patients_router":
        from .patients import router
        return router
    elif name == "metrics_router":
        from .metrics import router
        return router
    elif name == "clinical_router":
        from .clinical import router
        return router
    elif name == "operational_router":
        from .operational import operational_router
        return operational_router
    elif name == "translate_router":
        from .translate import router
        return router
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "predict_router",
    "vitals_router",
    "vision_router",
    "patients_router",
    "metrics_router",
    "clinical_router",
    "operational_router",
    "translate_router",
]
