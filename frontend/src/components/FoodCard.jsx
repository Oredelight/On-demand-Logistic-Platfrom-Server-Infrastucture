import { motion } from 'framer-motion'
import { ShoppingCart, Star, Plus } from 'lucide-react'
import { formatPrice } from '../utils'

export default function FoodCard({ food, onAddToCart, index = 0 }) {
  const placeholder = `https://picsum.photos/seed/food${food.id}/400/280`

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="glass-card"
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0 }}>
        <img
          src={food.image_url || placeholder}
          alt={food.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
          onError={(e) => { e.target.src = placeholder }}
          onMouseEnter={e => { e.target.style.transform = 'scale(1.05)' }}
          onMouseLeave={e => { e.target.style.transform = 'scale(1)' }}
        />
        {/* Availability badge */}
        {!food.available && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: 'rgba(239,68,68,0.9)',
              color: '#fff',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700, fontSize: '0.8rem',
            }}>Unavailable</span>
          </div>
        )}
        {/* Price pill */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 12px',
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '0.9rem',
          color: 'var(--brand-amber)',
        }}>
          {formatPrice(food.price)}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
            {food.name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <Star size={12} fill="var(--brand-amber)" color="var(--brand-amber)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>4.8</span>
          </div>
        </div>

        {food.description && (
          <p style={{
            fontSize: '0.82rem', color: 'var(--text-muted)',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {food.description}
          </p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => food.available && onAddToCart(food)}
            disabled={!food.available}
            className="btn btn-primary w-full"
            style={{ gap: 6 }}
          >
            <Plus size={16} />
            Add to cart
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
