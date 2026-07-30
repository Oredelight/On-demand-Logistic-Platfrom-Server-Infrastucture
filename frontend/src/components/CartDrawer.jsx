import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Trash2, ShoppingCart, ArrowRight } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { cartApi } from '../api'
import { formatPrice, extractError } from '../utils'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, clearItems, totalPrice } = useCartStore()
  const navigate = useNavigate()

  const handleRemove = async (id) => {
    try {
      await cartApi.removeItem(id)
      removeItem(id)
      toast.success('Item removed')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const handleCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            className="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingCart size={20} color="var(--brand-amber)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Your Cart</h3>
                {items.length > 0 && (
                  <span style={{
                    background: 'var(--brand-gradient)',
                    color: '#fff', borderRadius: '50%',
                    width: 22, height: 22, fontSize: '0.72rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)',
                  }}>{items.length}</span>
                )}
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeCart}>
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {items.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={56} className="empty-state-icon" />
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Your cart is empty
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Add some delicious food to get started
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => { closeCart(); navigate('/menu') }}>
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AnimatePresence>
                    {items.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 12,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 600, fontSize: '0.9rem',
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{item.food}</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                              {item.protein && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--glass-border)' }}>
                                  🥩 {item.protein}
                                </span>
                              )}
                              {item.extras?.map((e, idx) => (
                                <span key={idx} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--glass-border)' }}>
                                  +{e}
                                </span>
                              ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>×{item.quantity}</span>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-amber)', fontSize: '0.9rem' }}>
                                {formatPrice(item.subtotal)}
                              </span>
                            </div>
                          </div>
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            style={{ flexShrink: 0, alignSelf: 'flex-start' }}
                            onClick={() => handleRemove(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Subtotal</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--brand-amber)' }}>
                    {formatPrice(totalPrice())}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Delivery fee, service fee & tax calculated at checkout
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary w-full btn-lg"
                  onClick={handleCheckout}
                >
                  Checkout <ArrowRight size={16} />
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
