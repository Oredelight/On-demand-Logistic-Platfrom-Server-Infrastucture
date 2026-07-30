import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal } from 'lucide-react'
import { foodApi } from '../api'
import FoodCard from '../components/FoodCard'
import AddToCartModal from '../components/AddToCartModal'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function MenuPage() {
  const [foods, setFoods] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFood, setSelectedFood] = useState(null)
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    foodApi.getFoods()
      .then(r => { setFoods(r.data); setFiltered(r.data) })
      .catch(() => toast.error('Could not load menu'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let list = foods
    if (!showUnavailable) list = list.filter(f => f.available)
    if (search.trim()) list = list.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    setFiltered(list)
  }, [search, showUnavailable, foods])

  const handleAddToCart = (food) => {
    if (!isAuthenticated) {
      toast('Please log in to add items to cart', { icon: '🔒' })
      navigate('/login')
      return
    }
    setSelectedFood(food)
  }

  return (
    <div className="page" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%)`,
        padding: '48px 0 32px',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ marginBottom: 8 }}>
              Our <span className="gradient-text">Menu</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
              {foods.filter(f => f.available).length} dishes available right now
            </p>

            {/* Search + Filter */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 500 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  placeholder="Search dishes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 40 }}
                />
              </div>
              <button
                className={`btn ${showUnavailable ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowUnavailable(!showUnavailable)}
                style={{ gap: 6 }}
              >
                <SlidersHorizontal size={16} />
                {showUnavailable ? 'Showing All' : 'Available Only'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Grid */}
      <div className="container section">
        {loading ? (
          <div className="page-loader">
            <div className="spinner" />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>Loading menu...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '3rem' }}>🍽️</span>
            <h3>No dishes found</h3>
            <p>Try a different search term</p>
          </div>
        ) : (
          <div className="grid-auto">
            {filtered.map((food, i) => (
              <FoodCard
                key={food.id}
                food={food}
                index={i}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {selectedFood && (
        <AddToCartModal food={selectedFood} onClose={() => setSelectedFood(null)} />
      )}
    </div>
  )
}
