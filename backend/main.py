from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import news, preferences, auth

app = FastAPI(title="Morning Report API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
app.include_router(news.router, prefix="/news", tags=["news"])

@app.get("/")
def root():
    return {"status": "Morning Report API running"}
