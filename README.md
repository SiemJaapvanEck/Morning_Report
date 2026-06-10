# 🌅 Morning Report

A personalized daily news app. Pick your topics, get your digest.

## Project Structure

```
morning-report/
├── frontend/        # React + Vite
└── backend/         # Python FastAPI
```

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Add your NewsAPI key
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

**backend/.env**
- `NEWS_API_KEY` — get one free at https://newsapi.org
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — your Supabase anon key

**frontend/.env.local**
- `VITE_API_URL` — backend URL (default: http://localhost:8000)

## Team Git Workflow

```bash
# Start a new feature
git checkout -b feature/your-feature-name

# Push and open a PR when done
git push origin feature/your-feature-name
```
