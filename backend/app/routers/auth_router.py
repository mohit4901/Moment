"""
MOMENT Authentication & Healthcare Worker Onboarding Router
===========================================================
Handles:
1. ANM / GNM / Doctor / Nurse Registration with Government ID OCR Verification
2. OCR Matching of uploaded ID card against input credentials (Name, Role, Facility, Area)
3. Easy Login with username / phone and password
4. Session retrieval & healthcare staff directory
"""
import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel, Field

from ..database import get_db, hash_password, verify_password
from ..services.ocr_service import ClinicalOcrService

auth_router = APIRouter(prefix="/api/auth", tags=["Healthcare Worker Authentication & ID Verification"])

# ── Pydantic Request Models ──
class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, description="Unique login identifier")
    password: str = Field(..., min_length=4, description="Staff login password")
    full_name: str = Field(..., min_length=2, description="Nurse / ANM / Doctor Full Name")
    role: str = Field(..., description="ANM, GNM, DOCTOR, NURSE, HOSPITAL_ADMIN, DISTRICT_ADMIN")
    age: Optional[int] = 30
    phone: Optional[str] = None
    facility_name: Optional[str] = "Sub-Centre Khedi Sadh"
    rural_area: Optional[str] = "Village Khedi Sadh, Rohtak"
    registration_no: Optional[str] = None
    id_card_url: Optional[str] = ""
    id_card_verified: Optional[bool] = False
    ocr_match_details: Optional[Dict[str, Any]] = None

class UserLoginRequest(BaseModel):
    username: str
    password: str


@auth_router.post("/ocr-id-card", summary="AI OCR Auto-Extraction from Healthcare Worker ID Card")
async def extract_id_card_fields_endpoint(
    file: UploadFile = File(...)
):
    """
    Accepts uploaded / captured photo of Staff Nurse, ANM, GNM, or Doctor ID card.
    Extracts text using OCR and parses all profile fields (Name, Role, Facility, Reg No, Age, Phone, Username)
    for instantaneous form autofill.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG, PNG, WEBP).")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    ocr_service = ClinicalOcrService.get_instance()
    result = ocr_service.extract_id_card_data(contents)
    f = result.get("extracted_fields", {})
    print(f"🆔 \033[96;1m[AI ID CARD OCR AUTO-EXTRACTED]\033[0m File: {file.filename} ({len(contents)} bytes)")
    print(f"   ↳ Staff Name:            \033[92;1m{f.get('full_name')}\033[0m")
    print(f"   ↳ Professional Role:     {f.get('role')}")
    print(f"   ↳ Registration Number:   {f.get('registration_no')}")
    print(f"   ↳ Assigned Facility:     {f.get('facility_name')}")
    print(f"   ↳ Rural Jurisdiction:    {f.get('rural_area')}")
    print(f"   ↳ Mobile / Phone:        {f.get('phone')}")
    print(f"   ↳ Auto-filled Username:  \033[93;1m{f.get('username')}\033[0m")
    return result


@auth_router.post("/verify-id-card", summary="OCR Scan & Verification of Healthcare Worker ID Card")
async def verify_id_card_photo(
    file: UploadFile = File(...),
    full_name: str = Form(""),
    role: str = Form("ANM"),
    facility_name: str = Form(""),
    rural_area: str = Form(""),
    registration_no: str = Form(""),
    age: Optional[int] = Form(30)
):
    """
    Accepts uploaded / captured photo of Staff Nurse, ANM, GNM, or Doctor ID card.
    Extracts text using OCR and cross-matches against the entered profile data.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG, PNG, WEBP).")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    ocr_service = ClinicalOcrService.get_instance()
    user_payload = {
        "full_name": full_name,
        "role": role,
        "facility_name": facility_name,
        "rural_area": rural_area,
        "registration_no": registration_no,
        "age": age
    }

    result = ocr_service.verify_id_card(contents, user_payload)
    return result


@auth_router.post("/register", summary="Register New ANM / GNM / Doctor")
def register_user(req: UserRegisterRequest):
    """
    Creates a new healthcare worker account with credentials, rural facility assignment,
    and ID Card OCR verification status.
    """
    u_name = req.username.strip().lower()
    now_str = datetime.now().isoformat()
    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE LOWER(username) = ?;", (u_name,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="यह यूजरनेम पहले से पंजीकृत है (Username already exists).")

        pwd_h = hash_password(req.password)
        ocr_json = json.dumps(req.ocr_match_details) if req.ocr_match_details else ""
        verified_int = 1 if req.id_card_verified else 0

        cursor.execute("""
        INSERT INTO users (
            id, username, password_hash, full_name, role, age, registration_no,
            facility_id, facility_name, rural_area, phone, id_card_url,
            id_card_verified, ocr_match_details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            user_id,
            u_name,
            pwd_h,
            req.full_name.strip(),
            req.role.upper().strip(),
            req.age or 30,
            req.registration_no or "",
            f"FAC-{uuid.uuid4().hex[:6].upper()}",
            req.facility_name or "",
            req.rural_area or "",
            req.phone or "",
            req.id_card_url or "",
            verified_int,
            ocr_json,
            now_str
        ))

        cursor.execute("""
        SELECT id, username, full_name, role, age, registration_no, facility_name, rural_area, phone, id_card_verified, created_at
        FROM users WHERE id = ?;
        """, (user_id,))
        user_row = cursor.fetchone()

        print(f"💾 \033[92;1m[SQLITE DB INSERT - USER]\033[0m Registered new healthcare worker:")
        print(f"   ↳ ID: {user_id} | Name: {req.full_name} | Role: {req.role.upper()} | Username: {u_name}")
        print(f"   ↳ Facility: {req.facility_name} ({req.rural_area}) | Reg No: {req.registration_no or 'N/A'}")
        print(f"   ↳ ID Card OCR Verified: {'YES ✅' if req.id_card_verified else 'PENDING'}")

        return {
            "status": "success",
            "message": f"स्वास्थ्य कर्मी '{req.full_name}' का पंजीकरण सफलतापूर्वक संपन्न हुआ।",
            "token": f"moment_jwt_{uuid.uuid4().hex}",
            "user": user_row
        }


@auth_router.post("/login", summary="Login ANM / GNM / Doctor")
def login_user(req: UserLoginRequest):
    """
    Authenticates worker with username (or mobile phone) and password.
    Returns staff profile and session token.
    """
    ident = req.username.strip().lower()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM users
        WHERE LOWER(username) = ? OR phone = ?;
        """, (ident, req.username.strip()))
        user = cursor.fetchone()

        if not user:
            print(f"🔒 \033[91;1m[AUTH FAILURE]\033[0m No user found matching username or mobile: '{req.username}'")
            raise HTTPException(status_code=401, detail="गलत यूजरनेम या मोबाइल नंबर (Invalid username or mobile).")

        stored_hash = user.get("password_hash", "")
        if not verify_password(req.password, stored_hash):
            print(f"🔒 \033[91;1m[AUTH FAILURE]\033[0m Password mismatch for user '{user.get('username')}'")
            raise HTTPException(status_code=401, detail="गलत पासवर्ड (Incorrect password).")

        # Strip password before returning
        user_safe = {k: v for k, v in user.items() if k != "password_hash"}

        print(f"🔐 \033[92;1m[STAFF AUTHENTICATION SUCCESS]\033[0m Healthcare Worker Logged In:")
        print(f"   ↳ Name: \033[1m{user.get('full_name')}\033[0m | Role: \033[93m{user.get('role')}\033[0m | Facility: {user.get('facility_name')}")
        print(f"   ↳ User ID: {user.get('id')} | Jurisdiction: {user.get('rural_area')}")
        return {
            "status": "success",
            "message": f"स्वागत है, {user['full_name']}!",
            "token": f"moment_session_{uuid.uuid4().hex}",
            "user": user_safe
        }


@auth_router.get("/me", summary="Get Current Logged In Healthcare Worker")
def get_current_user_profile(user_id: Optional[str] = None):
    """Retrieves worker profile and assigned maternal registry stats."""
    uid = user_id or "USR-ANM"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?;", (uid,))
        user = cursor.fetchone()
        if not user:
            # Fallback to first available ANM
            cursor.execute("SELECT * FROM users WHERE role = 'ANM' LIMIT 1;")
            user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_safe = {k: v for k, v in user.items() if k != "password_hash"}

        # Fetch count of registered mothers for this worker
        cursor.execute("SELECT COUNT(*) as total_mothers FROM patients WHERE registered_by_user_id = ?;", (user["id"],))
        mother_count = cursor.fetchone()["total_mothers"]
        user_safe["assigned_mothers_count"] = mother_count

        return user_safe


@auth_router.get("/users", summary="List All Healthcare Workers")
def list_healthcare_workers():
    """Returns directory of rural doctors, ANMs, GNMs, and hospital administrators."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, username, full_name, role, age, registration_no, facility_name, rural_area, phone, id_card_verified, created_at
        FROM users
        ORDER BY role ASC, full_name ASC;
        """)
        return cursor.fetchall()
