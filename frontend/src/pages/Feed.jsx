import { useState, useEffect } from 'react'
import NewsCard from '../components/NewsCard'
import './Feed.css'

const CATEGORIES = ['technology', 'sports', 'business', 'health', 'science', 'entertainment']

// Mock articles for development (replace with API call)
const MOCK_ARTICLES = Array.from({ length: 6 }, (_, i) => ({
  title: `Breaking: Major development in ${CATEGORIES[i % CATEGORIES.length]} sector shakes up the industry`,
  description: 'A compelling summary of what happened, why it matters, and what comes next. This is where the key details live.',
  url: '#',
  urlToImage: `https://picsum.photos/seed/${i + 10}/600/400`,
  source: { name: ['BBC News', 'Reuters', 'NRC', 'The Verge', 'AP News', 'Bloomberg'][i] },
  publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
}))

export default function Feed() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    // TODO: replace with real API call
    // const res = await axios.get('/api/news/feed?categories=technology,sports')
    setTimeout(() => {
      setArticles(MOCK_ARTICLES)
      setLoading(false)
    }, 600)
  }, [])

  return (
    <main className="feed">
      <div className="feed__header">
        <h1 className="feed__title">Your Morning Report</h1>
        <p className="feed__subtitle">Curated for you — {new Date().toLocaleDateString('en-GB', { weekday: 'long' })} edition</p>
      </div>

      <div className="feed__filters">
        <button
          className={`feed__filter ${activeCategory === 'all' ? 'feed__filter--active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`feed__filter ${activeCategory === cat ? 'feed__filter--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="feed__loading">
          <div className="feed__spinner" />
          <p>Fetching your news…</p>
        </div>
      ) : (
        <div className="feed__grid">
          {articles.map((article, i) => (
            <NewsCard key={i} article={article} />
          ))}
        </div>
      )}
    </main>
  )
}
