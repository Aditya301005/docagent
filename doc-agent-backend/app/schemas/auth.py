from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Password must be at least 8 characters.")
    full_name: str = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
