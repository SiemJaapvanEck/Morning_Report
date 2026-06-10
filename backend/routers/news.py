from fastapi import APIRouter
from services.news_service import fetch_headlines

router = APIRouter()

@router.get("/feed")
async def get_feed(categories: str = "technology,sports", country: str = "nl"):
    category_list = [c.strip() for c in categories.split(",")]
    articles = await fetch_headlines(category_list, country)
    return {"articles": articles, "count": len(articles)}
