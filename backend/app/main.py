import os
from pathlib import Path

# Load .env from project root (GROQ_API_KEY, etc.)
_env_path = Path(__file__).resolve().parents[2] / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import ROOT_DIR, MODELS_DIR
from .services.model_service import ModelService
from .services.vision_service import VisionService
from .services.shock_service import ShockIndexService
from .database import init_db, seed_database_if_empty
from .routers.database_router import db_router
from .routers import (
    predict_router,
    vitals_router,
    vision_router,
    patients_router,
    metrics_router,
    clinical_router,
    operational_router,
    translate_router,
)
from .routers.auth_router import auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preloads all machine learning and deep learning models upon startup and initializes SQLite."""
    print("=" * 65)
    print("🏥 Starting MOMENT Obstetric AI Backend Service...")
    print("=" * 65)
    
    # Initialize & seed SQLite database
    try:
        init_db()
        seed_database_if_empty()
        print("✅ Production SQLite database initialized with 20 tables & seed registry.")
    except Exception as e:
        print(f"⚠️ Error initializing database: {e}")

    # Initialize & verify MongoDB Atlas cluster for patients & pregnancies
    try:
        from .mongodb_client import test_mongo_connection
        mongo_status = test_mongo_connection()
        if mongo_status.get("status") == "connected":
            print(f"🍃 \033[92;1m[MONGODB ATLAS CONNECTED]\033[0m Database 'moment_clinical' active. Collections: {mongo_status.get('collections')}")
        else:
            print(f"⚠️ MongoDB Atlas not connected: {mongo_status.get('message')}")
    except Exception as e:
        print(f"⚠️ Error initializing MongoDB Atlas: {e}")

    # Warm up services
    try:
        model_svc = ModelService.get_instance()
        shock_svc = ShockIndexService.get_instance()
        vision_svc = VisionService.get_instance()
        print("✅ All AI inference engines warmed up and loaded into memory.")
    except Exception as e:
        print(f"⚠️ Error during model warm-up: {e}")

    yield

    print("🛑 Shutting down MOMENT AI Backend...")


app = FastAPI(
    title="MOMENT — Maternal Obstetric Monitoring & Hemorrhage Intelligence API",
    description="""
### Clinical AI Platform for Postpartum Hemorrhage (PPH) Early Warning & Triage

Provides real-time clinical inference across 3 distinct modalities:
1. **Module A — Antepartum Tabular Risk Engine:** Zero-leakage admission scoring via XGBoost, LightGBM, FT-Transformer (PyTorch), and Isotonic Calibrated Ensembles.
2. **Module B — Hemodynamic Shock Surveillance:** Real-time maternal Shock Index ($HR / SBP$) with 4-tier decompensation alerts.
3. **Module C — Computer Vision Pad Saturation:** ResNet-50 deep learning visual quantification of postpartum pad lochia into Routine, Amber, and Critical tiers.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for seamless frontend integration across all local ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# High-Visibility Real-Time Clinical Console Logger
@app.middleware("http")
async def clinical_console_logger(request, call_next):
    path = request.url.path
    method = request.method
    
    # Check if request is a clinical / dynamic operation
    is_alert_polling = path == "/api/alerts" and method == "GET"
    is_health = path == "/api/health" or "/assets/" in path or path.endswith((".js", ".css", ".ico", ".svg", ".png", ".jpg"))
    is_clinical = not is_health and any(k in path for k in [
        "/api/predict", "/api/reports", "/api/vision", "/api/vitals",
        "/api/blood-loss", "/api/patients", "/api/twilio", "/api/auth",
        "/api/facilities", "/api/db"
    ])
    
    if is_clinical:
        print("\n" + "═" * 75)
        if "/api/reports/ocr" in path:
            print(f"📄 \033[94;1m[AI REPORT OCR SCANNER]\033[0m {method} {path} — Processing Clinical Lab / ANC Card...")
        elif "/api/auth/ocr-id-card" in path:
            print(f"🆔 \033[96;1m[AI ID CARD OCR AUTODETECT]\033[0m {method} {path} — Extracting Staff Profile...")
        elif "/api/predict/patient" in path:
            print(f"🤖 \033[95;1m[AI ML RISK PREDICTION]\033[0m {method} {path} — Evaluating XGBoost + LightGBM + FT-Transformer...")
        elif "/api/vision/pad-classify" in path:
            print(f"🩸 \033[91;1m[COMPUTER VISION PAD TRIAGE]\033[0m {method} {path} — ResNet-50 Deep Learning Pad Saturation...")
        elif "/api/patients" in path:
            print(f"🏥 \033[92;1m[MATERNAL REGISTRY CRUD]\033[0m {method} {path} (Dynamic SQLite Database Operation)")
        elif "/api/vitals" in path:
            print(f"💓 \033[93;1m[HEMODYNAMIC MONITORING]\033[0m {method} {path} — Recording Vitals & Shock Index...")
        elif "/api/blood-loss" in path:
            print(f"🩸 \033[91;1m[BLOOD LOSS QUANTIFICATION]\033[0m {method} {path} — Recording Postpartum Blood Loss...")
        elif "/api/twilio" in path:
            print(f"📞 \033[96;1m[TWILIO EMERGENCY ESCALATION]\033[0m {method} {path} — Live Call / WhatsApp Alert...")
        elif "/api/facilities" in path:
            print(f"🗺️  \033[94;1m[GEOSPATIAL ROUTING]\033[0m {method} {path} — Ranking Capable Emergency Facilities...")
        elif "/api/auth" in path:
            print(f"🔐 \033[93;1m[STAFF AUTHENTICATION]\033[0m {method} {path}")
        else:
            print(f"⚡ \033[97;1m[MOMENT BACKEND]\033[0m {method} {path}")

    start_time = datetime.now()
    response = await call_next(request)
    duration_ms = (datetime.now() - start_time).total_seconds() * 1000

    if is_clinical:
        status_color = "\033[92m" if response.status_code < 400 else "\033[91m"
        print(f"   ↳ {status_color}Status: {response.status_code}\033[0m | Processing Latency: {duration_ms:.1f}ms")
        print("═" * 75 + "\n")
    
    return response

# Register route modules
app.include_router(auth_router)
app.include_router(db_router)
app.include_router(predict_router)
app.include_router(vitals_router)
app.include_router(vision_router)
app.include_router(patients_router)
app.include_router(metrics_router)
app.include_router(clinical_router)
app.include_router(operational_router, prefix="/api")
app.include_router(translate_router)


@app.get("/api/health", tags=["System"])
def health_check():
    model_svc = ModelService.get_instance()
    vision_svc = VisionService.get_instance()
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "xgboost": model_svc.xgb_model is not None,
            "lightgbm": model_svc.lgb_booster is not None,
            "fttransformer": model_svc.ftt_model is not None,
            "calibrator_xgb": model_svc.calibrator_xgb is not None,
            "calibrator_lgb": model_svc.calibrator_lgb is not None,
            "calibrator_ftt": model_svc.calibrator_ftt is not None,
            "vision_backbone": vision_svc.backbone is not None,
            "vision_classifier_head": vision_svc.classifier is not None,
        },
        "all_systems_ready": bool(model_svc.models_loaded and vision_svc.is_loaded)
    }


from fastapi.staticfiles import StaticFiles

# Mount static frontend production build if available
frontend_dist = ROOT_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/", tags=["System"])
    def root():
        return {
            "service": "MOMENT Obstetric Intelligence API",
            "version": "1.0.0",
            "documentation": "/docs",
            "status": "online",
            "clinical_goal": "Eliminating preventable maternal mortality from postpartum hemorrhage"
        }

