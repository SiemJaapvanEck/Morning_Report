import { useState } from 'react'
import './Preferences.css'

const ALL_CATEGORIES = [
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'business', label: 'Business', emoji: '📈' },
  { id: 'health', label: 'Health', emoji: '🏃' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'politics', label: 'Politics', emoji: '🗳️' },
]

export default function Preferences() {
  const [selected, setSelected] = useState(['technology', 'sports'])
  const [saved, setSaved] = useState(false)

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
    setSaved(false)
  }

  const handleSave = () => {
    // TODO: POST to /api/preferences/{user_id}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <main className="prefs">
      <h1 className="prefs__title">Your Topics</h1>
      <p className="prefs__desc">Pick the categories you want in your daily digest.</p>

      <div className="prefs__grid">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`prefs__card ${selected.includes(cat.id) ? 'prefs__card--active' : ''}`}
            onClick={() => toggle(cat.id)}
          >
            <span className="prefs__emoji">{cat.emoji}</span>
            <span className="prefs__label">{cat.label}</span>
            {selected.includes(cat.id) && <span className="prefs__check">✓</span>}
          </button>
        ))}
      </div>

      <div className="prefs__actions">
        <button
          className="prefs__save"
          onClick={handleSave}
          disabled={selected.length === 0}
        >
          {saved ? 'Saved!' : 'Save preferences'}
        </button>
        {selected.length === 0 && (
          <p className="prefs__error">Pick at least one topic.</p>
        )}
      </div>
    </main>
  )
}
