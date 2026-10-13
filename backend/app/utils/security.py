"""
MOMENT Security & Authentication Framework
==========================================
Provides:
- Standard HMAC-SHA256 JWT generation and validation
- Cryptographic password hashing and verification
- FastAPI Dependency Injection for Auth & Role-Based Access Control (RBAC)
"""
import os
import time
import hmac
import hashlib
import base64
import json
from typing import Optional, Dict, Any, List
from fastapi import Header, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..database import get_db

JWT_SECRET = os.environ.get("JWT_SECRET", "moment_production_clinical_jwt_secret_key_2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_SECONDS = 86400 * 7 # 7 days validity

security_bearer = HTTPBearer(auto_error=False)


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def create_access_token(payload: Dict[str, Any]) -> str:
    """Generates standard RFC 7519 HS256 JWT token with expiration timestamp."""
    header = {"alg": "HS256", "typ": "JWT"}
    body = dict(payload)
    body["iat"] = int(time.time())
    body["exp"] = int(time.time()) + JWT_EXPIRATION_SECONDS

    header_b64 = _b64_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Dict[str, Any]:
    """Validates JWT signature, expiration, and decodes payload."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token format")

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid cryptographic token signature")

        payload = json.loads(_b64_decode(payload_b64).decode("utf-8"))
        if "exp" in payload and payload["exp"] < time.time():
            raise ValueError("Session token expired. Please re-authenticate.")

        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")


def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    x_auth_token: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Extracts and authenticates user from Authorization Bearer header or X-Auth-Token header.
    Returns the user profile from database.
    """
    raw_token = None
    if auth_header and auth_header.credentials:
        raw_token = auth_header.credentials
    elif x_auth_token:
        raw_token = x_auth_token

    if not raw_token:
        # Check if local development authorization is enabled
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token in Authorization header."
        )

    # Decode and verify token
    payload = decode_access_token(raw_token)
    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload: missing user_id.")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Authenticated user no longer exists in registry.")

        # Return safe user dictionary without password hash
        return {k: v for k, v in user.items() if k != "password_hash"}


def require_roles(allowed_roles: List[str]):
    """Role-Based Access Control (RBAC) dependency factory."""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = (current_user.get("role") or "").upper()
        allowed_upper = [r.upper() for r in allowed_roles]

        if "ADMIN" in allowed_upper and user_role in ["HOSPITAL_ADMIN", "DISTRICT_ADMIN", "ADMIN"]:
            return current_user

        if user_role not in allowed_upper:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{user_role}' does not have sufficient permission for this clinical endpoint."
            )
        return current_user

    return role_checker
