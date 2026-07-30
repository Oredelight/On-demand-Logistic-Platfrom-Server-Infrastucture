import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, User, LogOut, LayoutDashboard, UtensilsCrossed, Menu as MenuIcon, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { authApi } from '../api'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { isAuthenticated, role, logout, refreshToken } = useAuthStore()
  const { totalItems, openCart } = useCartStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const count = totalItems()

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken) } catch (_) {}
    logout()
    toast.success('Logged out')
    navigate('/')
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/menu', label: 'Menu' },
    ...(isAuthenticated ? [{ to: '/orders', label: 'Orders' }] : []),
    ...(role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  const isActive = (to) => location.pathname === to

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 'var(--navbar-h)',
        background: 'rgba(10,10,12,0.85)',
        borderBottom: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--brand-gradient)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UtensilsCrossed size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: '1.25rem',
              background: 'var(--brand-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>DeliFoods</span>
          </Link>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} className="desktop-nav">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)',
                fontWeight: 500, fontSize: '0.9rem',
                color: isActive(to) ? 'var(--brand-amber)' : 'var(--text-secondary)',
                background: isActive(to) ? 'rgba(245,158,11,0.1)' : 'transparent',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={e => { if (!isActive(to)) e.target.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (!isActive(to)) e.target.style.color = 'var(--text-secondary)' }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Cart button */}
            {isAuthenticated && (
              <button onClick={openCart} className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
                <ShoppingCart size={20} />
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      style={{
                        position: 'absolute', top: 2, right: 2,
                        background: 'var(--brand-gradient)',
                        color: '#fff', borderRadius: '50%',
                        width: 18, height: 18,
                        fontSize: '0.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)',
                      }}
                    >{count}</motion.span>
                  )}
                </AnimatePresence>
              </button>
            )}

            {isAuthenticated ? (
              <>
                <Link to="/profile" className="btn btn-ghost btn-icon" title="Profile">
                  <User size={20} />
                </Link>
                {role === 'admin' && (
                  <Link to="/admin" className="btn btn-ghost btn-icon" title="Admin">
                    <LayoutDashboard size={20} />
                  </Link>
                )}
                <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Logout">
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button className="btn btn-ghost btn-icon mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="overlay"
              style={{ zIndex: 48 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 260,
                background: 'var(--bg-card)',
                borderLeft: '1px solid var(--glass-border)',
                zIndex: 49, padding: '80px 24px 24px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    color: isActive(to) ? 'var(--brand-amber)' : 'var(--text-primary)',
                    background: isActive(to) ? 'rgba(245,158,11,0.1)' : 'transparent',
                  }}
                >{label}</Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .desktop-nav { display: flex; }
        .mobile-menu-btn { display: none; }
        @media (max-width: 768px) {
          .desktop-nav { display: none; }
          .mobile-menu-btn { display: flex; }
        }
      `}</style>
    </>
  )
}
