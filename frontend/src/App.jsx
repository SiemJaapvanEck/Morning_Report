import { Routes, Route } from 'react-router-dom'
import Feed from './pages/Feed'
import Preferences from './pages/Preferences'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/preferences" element={<Preferences />} />
      </Routes>
    </div>
  )
}
