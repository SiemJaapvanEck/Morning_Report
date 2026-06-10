from fastapi import APIRouter
from models.user import PreferencesUpdate

router = APIRouter()

# Placeholder — wire up to Supabase when ready
@router.get("/{user_id}")
async def get_preferences(user_id: str):
    return {"user_id": user_id, "categories": ["technology", "sports"], "language": "en", "country": "nl"}

@router.put("/{user_id}")
async def update_preferences(user_id: str, prefs: PreferencesUpdate):
    return {"user_id": user_id, **prefs.dict()}
