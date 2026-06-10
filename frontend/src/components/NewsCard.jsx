import './NewsCard.css'

export default function NewsCard({ article }) {
  const { title, description, url, urlToImage, source, publishedAt } = article

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000)
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="news-card">
      {urlToImage && (
        <div className="news-card__image">
          <img src={urlToImage} alt={title} loading="lazy" />
        </div>
      )}
      <div className="news-card__body">
        <div className="news-card__meta">
          <span className="news-card__source">{source?.name}</span>
          <span className="news-card__time">{timeAgo(publishedAt)}</span>
        </div>
        <h3 className="news-card__title">{title}</h3>
        {description && <p className="news-card__desc">{description}</p>}
      </div>
    </a>
  )
}
