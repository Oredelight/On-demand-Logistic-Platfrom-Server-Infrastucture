import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, CheckSquare, Square } from 'lucide-react'
import { useState, useEffect } from 'react'
import { foodApi, cartApi } from '../api'
import { useCartStore } from '../store/cartStore'
import { formatPrice, extractError } from '../utils'
import toast from 'react-hot-toast'

export default function AddToCartModal({ food, onClose }) {
  const [proteins, setProteins] = useState([])
  const [extras, setExtras] = useState([])
  const [selectedProtein, setSelectedProtein] = useState(null)
  const [selectedExtras, setSelectedExtras] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const { addItem, openCart } = useCartStore()

  useEffect(() => {
    Promise.all([foodApi.getProteins(), foodApi.getExtras()])
      .then(([pRes, eRes]) => {
        setProteins(pRes.data.filter(p => p.available !== false))
        setExtras(eRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleExtra = (e) =>
    setSelectedExtras(prev =>
      prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id]
    )

  const calcTotal = () => {
    const base = food.price
    const pPrice = proteins.find(p => p.id === selectedProtein)?.price || 0
    const ePrice = extras.filter(e => selectedExtras.includes(e.id)).reduce((s, e) => s + e.price, 0)
    return (base + pPrice + ePrice) * quantity
  }

  const handleAdd = async () => {
    setAdding(true)
    try {
      const res = await cartApi.addToCart({
        food_item_id: food.id,
        quantity,
        protein_id: selectedProtein || null,
        extras_id: selectedExtras,
        instructions: instructions || null,
      })
      // Normalize: API returns cart_item_id, store deduplicates by id
      const cartItem = { ...res.data, id: res.data.cart_item_id }
      addItem(cartItem)
      toast.success(`${food.name} added to cart!`)
      onClose()
      openCart()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setAdding(false)
    }
  }

  return (
    <AnimatePresence>
      <>
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div
          className="modal"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{food.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Customise your order
              </p>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Quantity */}
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', marginBottom: 10, color: 'var(--text-secondary)' }}>
                  QUANTITY
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="btn btn-outline btn-icon btn-sm" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus size={14} />
                  </button>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', minWidth: 24, textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button className="btn btn-outline btn-icon btn-sm" onClick={() => setQuantity(q => q + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Proteins */}
              {proteins.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', marginBottom: 10, color: 'var(--text-secondary)' }}>
                    PROTEIN <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {proteins.map(p => (
                      <label key={p.id} onClick={() => setSelectedProtein(selectedProtein === p.id ? null : p.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${selectedProtein === p.id ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
                          background: selectedProtein === p.id ? 'rgba(245,158,11,0.07)' : 'var(--bg-surface)',
                          cursor: 'pointer', transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%',
                            border: `2px solid ${selectedProtein === p.id ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
                            background: selectedProtein === p.id ? 'var(--brand-amber)' : 'transparent',
                            flexShrink: 0,
                          }} />
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>{p.name}</span>
                        </div>
                        <span style={{ color: 'var(--brand-amber)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem' }}>
                          +{formatPrice(p.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras */}
              {extras.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', marginBottom: 10, color: 'var(--text-secondary)' }}>
                    EXTRAS <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(select multiple)</span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {extras.map(e => {
                      const checked = selectedExtras.includes(e.id)
                      return (
                        <label key={e.id} onClick={() => toggleExtra(e)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${checked ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
                            background: checked ? 'rgba(245,158,11,0.07)' : 'var(--bg-surface)',
                            cursor: 'pointer', transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {checked
                              ? <CheckSquare size={18} color="var(--brand-amber)" />
                              : <Square size={18} color="var(--text-muted)" />
                            }
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>{e.name}</span>
                          </div>
                          <span style={{ color: 'var(--brand-amber)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem' }}>
                            +{formatPrice(e.price)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="form-group">
                <label className="form-label">Special Instructions (optional)</label>
                <textarea
                  className="form-input"
                  placeholder="Any allergies or preferences..."
                  rows={2}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Total + CTA */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--brand-amber)' }}>
                    {formatPrice(calcTotal())}
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary w-full btn-lg"
                  onClick={handleAdd}
                  disabled={adding}
                >
                  {adding ? <><div className="spinner spinner-sm" /> Adding...</> : 'Add to Cart'}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </>
    </AnimatePresence>
  )
}
