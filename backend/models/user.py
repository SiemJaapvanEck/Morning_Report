from pydantic import BaseModel
from typing import List

CATEGORIES = ["technology", "sports", "business", "health", "science", "entertainment", "politics"]

class UserPreferences(BaseModel):
    user_id: str
    categories: List[str]
    language: str = "en"
    country: str = "nl"

class PreferencesUpdate(BaseModel):
    categories: List[str]
    language: str = "en"
    country: str = "nl"
