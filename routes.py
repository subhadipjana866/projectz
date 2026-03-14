from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from datetime import timedelta
from schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from auth import PasswordService, JWTService
from database import get_db
from supabase import Client
from config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()
settings = get_settings()


async def get_token_from_header(credentials = Depends(security)):
    """Extract token from Authorization header"""
    return credentials.credentials


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db: Client = Depends(get_db)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = db.table("users").select("*").eq(
            "email", user_data.email
        ).execute()
        
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = PasswordService.hash_password(user_data.password)
        
        # Create user in database
        response = db.table("users").insert({
            "email": user_data.email,
            "password": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "type": user_data.type
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        user = response.data[0]
        
        # Create JWT token
        access_token = JWTService.create_access_token(
            data={"sub": user["email"]},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                type=user["type"]
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Client = Depends(get_db)):
    """Login with email and password"""
    try:
        # Find user by email
        response = db.table("users").select("*").eq(
            "email", credentials.email
        ).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user = response.data[0]
        
        # Verify password
        if not PasswordService.verify_password(credentials.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create JWT token
        access_token = JWTService.create_access_token(
            data={"sub": user["email"]},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                type=user["type"]
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    token: str = Depends(get_token_from_header),
    db: Client = Depends(get_db)
):
    """Get current authenticated user"""
    
    # Decode token
    payload = JWTService.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    email: str = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Get user from database
    response = db.table("users").select("*").eq(
        "email", email
    ).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = response.data[0]
    return UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        type=user["type"]
    )
