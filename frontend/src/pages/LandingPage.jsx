import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Clock, Star, ChefHat, Truck, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { foodApi } from '../api'
import FoodCard from '../components/FoodCard'
import AddToCartModal from '../components/AddToCartModal'
import { useAuthStore } from '../store/authStore'

const FEATURES = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Orders confirmed in seconds. Food at your door in 30 mins.' },
  { icon: ChefHat, title: 'Chef Quality', desc: 'Every meal crafted by skilled chefs with fresh ingredients.' },
  { icon: Shield, title: 'Safe & Secure', desc: 'Contactless delivery and encrypted payments always.' },
]

export default function LandingPage() {
  const [featured, setFeatured] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    foodApi.getFoods()
      .then(r => setFeatured(r.data.filter(f => f.available).slice(0, 4)))
      .catch(() => {})
  }, [])

  return (
    <div className="page">
      {/* ── Hero ── */}
      <section style={{
        minHeight: '92vh',
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.15) 0%, transparent 70%),
                     radial-gradient(ellipse 50% 40% at 80% 50%, rgba(234,88,12,0.08) 0%, transparent 60%),
                     var(--bg-base)`,
      }}>
        {/* Floating orbs */}
        <div style={{
          position: 'absolute', top: '15%', right: '8%',
          width: 420, height: 420,
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '5%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="container" style={{ zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
            {/* Left copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 16px', marginBottom: 24,
                }}
              >
                <Star size={14} fill="var(--brand-amber)" color="var(--brand-amber)" />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--brand-amber)' }}>
                  #1 Food Delivery in Lagos
                </span>
              </motion.div>

              <h1 style={{ marginBottom: 20 }}>
                Delicious Food,{' '}
                <span className="gradient-text">Delivered Fast</span>
              </h1>

              <p style={{ fontSize: '1.1rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 36, maxWidth: 480 }}>
                From your favourite local restaurants to your doorstep — fresh, hot and always on time. Order in 60 seconds.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/menu">
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="btn btn-primary btn-lg"
                    style={{ gap: 8 }}
                  >
                    Order Now <ArrowRight size={18} />
                  </motion.button>
                </Link>
                {!isAuthenticated && (
                  <Link to="/signup">
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      className="btn btn-outline btn-lg"
                    >
                      Create Account
                    </motion.button>
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
                {[['500+', 'Menu Items'], ['30min', 'Avg. Delivery'], ['4.9★', 'Rating']].map(([val, label]) => (
                  <div key={label}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{val}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
            >
              <div style={{
                width: 420, height: 420,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
                border: '1px solid rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{ fontSize: '140px', lineHeight: 1 }}>🍛</div>

                {/* Floating badges */}
                {[
                  { emoji: '🍔', x: -70, y: -120, delay: 0 },
                  { emoji: '🍕', x: 120, y: -80, delay: 0.15 },
                  { emoji: '🌮', x: 130, y: 90, delay: 0.3 },
                  { emoji: '🥗', x: -90, y: 100, delay: 0.45 },
                ].map(({ emoji, x, y, delay }) => (
                  <motion.div
                    key={emoji}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                      width: 56, height: 56,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.5rem',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >{emoji}</motion.div>
                ))}

                {/* Delivery card */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', bottom: -20, left: -40,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: 'var(--shadow-brand)',
                    minWidth: 200,
                  }}
                >
                  <div style={{ width: 36, height: 36, background: 'var(--brand-gradient)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Truck size={18} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem' }}>On the way!</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Arriving in ~25 mins</p>
                  </div>
                </motion.div>

                {/* Rating card */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  style={{
                    position: 'absolute', top: 0, right: -50,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <div style={{ display: 'flex' }}>
                    {'★★★★★'.split('').map((s, i) => (
                      <span key={i} style={{ color: 'var(--brand-amber)', fontSize: '0.9rem' }}>{s}</span>
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem' }}>4.9</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        <style>{`@media(max-width:768px){.hero-grid{grid-template-columns:1fr !important}.hero-right{display:none !important}}`}</style>
      </section>

      {/* ── Features ── */}
      <section className="section" style={{ background: 'var(--bg-elevated)' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: 48 }}
          >
            <h2>Why <span className="gradient-text">DeliFoods</span>?</h2>
            <p style={{ marginTop: 12, fontSize: '1rem', color: 'var(--text-secondary)' }}>
              We don't just deliver food. We deliver experiences.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="glass-card"
                style={{ padding: 28 }}
              >
                <div style={{
                  width: 52, height: 52,
                  background: 'var(--brand-gradient-soft)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Icon size={24} color="var(--brand-amber)" />
                </div>
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>{title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Menu ── */}
      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}
            >
              <div>
                <h2>Featured <span className="gradient-text">Today</span></h2>
                <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>Hand-picked favourites just for you</p>
              </div>
              <Link to="/menu" className="btn btn-outline" style={{ gap: 6 }}>
                View All <ArrowRight size={16} />
              </Link>
            </motion.div>

            <div className="grid-auto">
              {featured.map((food, i) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  index={i}
                  onAddToCart={(f) => isAuthenticated ? setSelectedFood(f) : null}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Banner ── */}
      <section style={{ padding: 'var(--space-3xl) 0' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            style={{
              background: `linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.1) 100%)`,
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(32px, 5vw, 60px)',
              textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--brand-amber)', marginBottom: 12 }}>
                🎉 Limited Time Offer
              </p>
              <h2 style={{ marginBottom: 16 }}>
                Free delivery on your <span className="gradient-text">first order!</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 28px' }}>
                Sign up today and enjoy free delivery on your first order. No code needed.
              </p>
              <Link to={isAuthenticated ? '/menu' : '/signup'}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="btn btn-primary btn-lg">
                  {isAuthenticated ? 'Order Now' : 'Get Started — It\'s Free'}
                  <ArrowRight size={18} />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {selectedFood && (
        <AddToCartModal food={selectedFood} onClose={() => setSelectedFood(null)} />
      )}
    </div>
  )
}
