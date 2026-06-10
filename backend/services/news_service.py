import httpx
import os
from dotenv import load_dotenv

load_dotenv()

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
BASE_URL = "https://newsapi.org/v2"

async def fetch_headlines(categories: list[str], country: str = "nl", page_size: int = 20):
    articles = []
    async with httpx.AsyncClient() as client:
        for category in categories:
            res = await client.get(f"{BASE_URL}/top-headlines", params={
                "apiKey": NEWS_API_KEY,
                "category": category,
                "country": country,
                "pageSize": page_size // len(categories),
            })
            if res.status_code == 200:
                articles += res.json().get("articles", [])
    return articles
