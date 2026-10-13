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
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

logger = logging.getLogger("moment.mongodb")

_client = None
_db = None

def get_mongo_uri() -> str:
    return os.getenv("MONGO_URI", "").strip()

def is_mongo_configured() -> bool:
    uri = get_mongo_uri()
    if not uri or "<db_password>" in uri or "password" in uri.lower() and "@cluster" not in uri:
        return False
    return uri.startswith("mongodb+srv://") or uri.startswith("mongodb://")

def get_mongo_db():
    global _client, _db
    if not is_mongo_configured():
        return None
    if _db is not None:
        return _db
    
    try:
        uri = get_mongo_uri()
        _client = MongoClient(uri, server_api=ServerApi('1'), serverSelectionTimeoutMS=5000)
        # Test connection ping
        _client.admin.command('ping')
        _db = _client.get_database("moment_clinical")
        logger.info("Successfully connected to MongoDB Atlas (database: moment_clinical)!")
        return _db
    except Exception as e:
        logger.warning(f"MongoDB Atlas connection check failed: {e}")
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
