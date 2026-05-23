from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from services.sqlite_db import get_db_connection
from services.auth_utils import hash_password, verify_password, create_jwt
import uuid
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, description="The unique username")
    password: str = Field(..., min_length=4, description="The secure password")
    role: str = Field(..., description="The role of the user (operator, maintenance, manager)")

class UserLogin(BaseModel):
    username: str = Field(..., description="The user's username")
    password: str = Field(..., description="The user's password")

@router.post("/signup")
async def signup(user_data: UserRegister):
    """
    Registers a new user inside the SQLite database, hashes their password,
    and returns a JWT session token.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Normalize and validate username uniqueness
        username_clean = user_data.username.strip()
        cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username_clean,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Bad Request",
                    "detail": "Username already exists",
                    "code": "USERNAME_TAKEN"
                }
            )
        
        # 2. Validate role selection
        role_clean = user_data.role.strip().lower()
        if role_clean not in ["operator", "maintenance", "manager"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Bad Request",
                    "detail": "Role must be 'operator', 'maintenance', or 'manager'",
                    "code": "INVALID_ROLE"
                }
            )

        # 3. Create the user record
        user_id = str(uuid.uuid4())
        pw_hash = hash_password(user_data.password)
        created_at = datetime.utcnow().isoformat()
        
        cursor.execute(
            "INSERT INTO users (id, username, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, username_clean, role_clean, pw_hash, created_at)
        )
        conn.commit()
        
        # 4. Create and return JWT session
        token = create_jwt({
            "user_id": user_id,
            "username": username_clean,
            "role": role_clean
        })
        
        return {
            "token": token,
            "session": {
                "user": {
                    "id": user_id,
                    "username": username_clean,
                    "role": role_clean
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "detail": f"Database registration failed: {str(e)}",
                "code": "DATABASE_ERROR"
            }
        )
    finally:
        conn.close()

@router.post("/login")
async def login(user_data: UserLogin):
    """
    Authenticates an existing user against the SQLite database and returns a JWT session token.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        username_clean = user_data.username.strip()
        
        # 1. Look up user by username (case-insensitive for safety)
        cursor.execute("SELECT id, username, role, password_hash FROM users WHERE LOWER(username) = LOWER(?)", (username_clean,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Unauthorized",
                    "detail": "Invalid username or password",
                    "code": "INVALID_CREDENTIALS"
                }
            )
            
        user_id, db_username, role, password_hash = row
        
        # 2. Verify password match
        if not verify_password(user_data.password, password_hash):
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Unauthorized",
                    "detail": "Invalid username or password",
                    "code": "INVALID_CREDENTIALS"
                }
            )
            
        # 3. Create and return JWT session
        token = create_jwt({
            "user_id": user_id,
            "username": db_username,
            "role": role
        })
        
        return {
            "token": token,
            "session": {
                "user": {
                    "id": user_id,
                    "username": db_username,
                    "role": role
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal Server Error",
                "detail": f"Authentication check failed: {str(e)}",
                "code": "DATABASE_ERROR"
            }
        )
    finally:
        conn.close()
