"""
MOMENT Production MongoDB Atlas Client
======================================
Connects to MongoDB Atlas cluster for cloud persistence of:
- mothers / maternal registry
- clinical_assessments & PPH risk inferences
- ocr_reports (scanned lab reports & extracted values)
- staff_profiles
"""
import os
import time
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

logger = logging.getLogger("moment.mongodb")

_client = None
_db = None
_last_failed_check = 0
_COOLDOWN_SECONDS = 120  # Avoid blocking DNS queries on every request

def get_mongo_uri() -> str:
    return os.getenv("MONGO_URI", "").strip()

def is_mongo_configured() -> bool:
    uri = get_mongo_uri()
    if not uri or "<db_password>" in uri or ("password" in uri.lower() and "@cluster" not in uri):
        return False
    return uri.startswith("mongodb+srv://") or uri.startswith("mongodb://")

def get_mongo_db():
    global _client, _db, _last_failed_check
    if not is_mongo_configured():
        return None
    if _db is not None:
        return _db
    
    # If connection previously failed, wait for cooldown before retrying to prevent blocking latency
    now = time.time()
    if now - _last_failed_check < _COOLDOWN_SECONDS:
        return None
    
    try:
        uri = get_mongo_uri()
        _client = MongoClient(uri, server_api=ServerApi('1'), serverSelectionTimeoutMS=1500)
        _client.admin.command('ping')
        _db = _client.get_database("moment_clinical")
        print("🍃 \033[92;1m[MONGODB ATLAS]\033[0m Successfully connected to cloud cluster (moment_clinical)!")
        return _db
    except Exception as e:
        _last_failed_check = now
        # Log gracefully once every cooldown period without spamming
        return None

def test_mongo_connection() -> Dict[str, Any]:
    if not is_mongo_configured():
        return {
            "status": "not_configured",
            "message": "MONGO_URI is either missing or contains placeholder <db_password>."
        }
    try:
        db = get_mongo_db()
        if db is not None:
            collections = db.list_collection_names()
            return {
                "status": "connected",
                "database": "moment_clinical",
                "collections": collections,
                "message": "MongoDB Atlas connection active and verified."
            }
        else:
            return {
                "status": "error",
                "message": "Failed to obtain MongoDB Atlas database instance."
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
