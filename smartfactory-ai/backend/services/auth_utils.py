import hmac
import hashlib
import json
import base64
import time
import os

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "smartfactory-ai-jwt-secret-key-change-in-prod")

def base64url_encode(data: bytes) -> str:
    """Encodes bytes to base64url format string."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    """Decodes a base64url format string to bytes."""
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2 with SHA-256.
    Generates a secure 16-byte salt and uses 100,000 iterations.
    
    Returns:
        A string formatted as 'salt_hex:hash_hex'
    """
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return salt.hex() + ":" + pw_hash.hex()

def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a password against a salt:hash string.
    """
    try:
        salt_hex, pw_hash_hex = hashed.split(":")
        salt = bytes.fromhex(salt_hex)
        pw_hash = bytes.fromhex(pw_hash_hex)
        test_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return hmac.compare_digest(test_hash, pw_hash)
    except Exception:
        return False

def create_jwt(payload: dict, expires_in: int = 3600 * 24 * 7) -> str:
    """
    Creates a JWT token signed with HMAC-SHA-256.
    Default expiration is 7 days.
    
    Args:
        payload: Payload dictionary to encode.
        expires_in: Expiration time in seconds.
        
    Returns:
        A JWT token string 'header.payload.signature'
    """
    header = {"alg": "HS256", "typ": "JWT"}
    payload = payload.copy()
    payload["exp"] = int(time.time()) + expires_in
    
    header_b64 = base64url_encode(json.dumps(header).encode())
    payload_b64 = base64url_encode(json.dumps(payload).encode())
    
    message = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str) -> dict:
    """
    Decodes and validates a JWT token using HMAC-SHA-256.
    
    Raises:
        ValueError if the token is expired, tampered, or invalid.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Verify signature
        message = f"{header_b64}.{payload_b64}".encode()
        expected_signature = hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).digest()
        expected_signature_b64 = base64url_encode(expected_signature)
        
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            raise ValueError("Signature mismatch")
            
        payload = json.loads(base64url_decode(payload_b64).decode())
        if payload.get("exp", 0) < time.time():
            raise ValueError("Token has expired")
            
        return payload
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}")
