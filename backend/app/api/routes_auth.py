from fastapi import APIRouter, HTTPException, status
from app.schemas import UserLoginSchema, TokenSchema

router = APIRouter()

@router.post("/auth/login", response_model=TokenSchema)
async def login(req: UserLoginSchema):
    """Simple authentication endpoint for traffic operators/admins."""
    if req.username in ["admin", "operator"] and req.password == "admin123":
        return TokenSchema(
            access_token="mock_jwt_token_urban_pulse_secure",
            token_type="bearer",
            role="admin" if req.username == "admin" else "operator",
            username=req.username
        )
    raise HTTPException(status_code=401, detail="Invalid username or password")
