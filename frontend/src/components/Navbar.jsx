import { Link } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <nav className="navbar">
      <div className="navbar__brand">
        <Link to="/">
          <span className="navbar__logo">Morning Report</span>
          <span className="navbar__date">{today}</span>
        </Link>
      </div>
      <div className="navbar__links">
        <Link to="/" className="navbar__link">Feed</Link>
        <Link to="/preferences" className="navbar__link navbar__link--cta">My Topics</Link>
      </div>
    </nav>
  )
}
