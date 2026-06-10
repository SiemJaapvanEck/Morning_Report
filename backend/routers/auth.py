from fastapi import APIRouter

router = APIRouter()

# Placeholder — implement Supabase Auth when ready
@router.get("/me")
async def get_me():
    return {"message": "Auth endpoint — wire up Supabase"}
