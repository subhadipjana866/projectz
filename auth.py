from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from config import get_settings
import hashlib
import bcrypt

settings = get_settings()


class PasswordService:
    @staticmethod
    def _hash_password_pre(password: str) -> str:
        """Pre-hash password using SHA256 to handle any length"""
        return hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using SHA256 + bcrypt"""
        # First hash with SHA256 to normalize any length password
        pre_hashed = PasswordService._hash_password_pre(password)
        # Then hash with bcrypt (pre_hashed is always 64 chars, well under 72 byte limit)
        hashed = bcrypt.hashpw(pre_hashed.encode('utf-8'), bcrypt.gensalt(rounds=12))
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        # Pre-hash the plain password the same way
        pre_hashed = PasswordService._hash_password_pre(plain_password)
        # Then verify with bcrypt
        return bcrypt.checkpw(pre_hashed.encode('utf-8'), hashed_password.encode('utf-8'))


class JWTService:
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.access_token_expire_minutes
            )
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and verify a JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm]
            )
            return payload
        except JWTError:
            return None
