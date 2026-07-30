import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Plus, ArrowRight, Loader } from 'lucide-react'
import { addressApi, orderApi } from '../api'
import { formatPrice, extractError } from '../utils'
import { useCartStore } from '../store/cartStore'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { items, totalPrice, clearItems } = useCartStore()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [instructions, setInstructions] = useState('')
  const [addingAddress, setAddingAddress] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: '', street: '', city: '', state: '', landmark: '' })
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)

  // Fee estimates
  const subtotal = totalPrice()
  const delivery = 500
  const service = subtotal * 0.05
  const tax = subtotal * 0.075
  const total = subtotal + delivery + service + tax

  useEffect(() => {
    if (items.length === 0) { navigate('/menu'); return }
    addressApi.list()
      .then(r => {
        setAddresses(r.data)
        const def = r.data.find(a => a.is_default)
        if (def) setSelectedAddress(def.id)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleAddAddress = async () => {
    if (!newAddr.label || !newAddr.street || !newAddr.city || !newAddr.state) {
      toast.error('Please fill all required address fields')
      return
    }
    try {
      const res = await addressApi.add(newAddr)
      setAddresses(a => [...a, res.data])
      setSelectedAddress(res.data.id)
      setAddingAddress(false)
      setNewAddr({ label: '', street: '', city: '', state: '', landmark: '' })
      toast.success('Address added!')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const handlePlaceOrder = async () => {
    setPlacing(true)
    try {
      const params = {}
      if (instructions) params.instructions = instructions
      if (selectedAddress) params.delivery_address_id = selectedAddress
      const res = await orderApi.placeOrder(params)
      clearItems()
      toast.success('Order placed! Proceeding to payment...')

      // Initiate Paystack payment
      const { paymentApi } = await import('../api')
      const payRes = await paymentApi.initiate(res.data.order_id)
      window.location.href = payRes.data.authorization_url
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return <div className="page page-loader"><div className="spinner" /></div>

  return (
    <div className="page" style={{ padding: '24px 0 48px' }}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ marginBottom: 8 }}>Checkout</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Review your order and choose a delivery address</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Order Summary */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>Order Items ({items.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem' }}>{item.food}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>×{item.quantity}</p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-amber)' }}>
                      {formatPrice(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>Delivery Address</h3>

              {addresses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {addresses.map(addr => (
                    <label key={addr.id}
                      onClick={() => setSelectedAddress(addr.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${selectedAddress === addr.id ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
                        background: selectedAddress === addr.id ? 'rgba(245,158,11,0.07)' : 'var(--bg-surface)',
                        cursor: 'pointer', transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        border: `2px solid ${selectedAddress === addr.id ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
                        background: selectedAddress === addr.id ? 'var(--brand-amber)' : 'transparent',
                      }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem' }}>{addr.label}</p>
                          {addr.is_default && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Default</span>}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {addr.street}, {addr.city}, {addr.state}
                          {addr.landmark && ` — near ${addr.landmark}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {!addingAddress ? (
                <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={() => setAddingAddress(true)}>
                  <Plus size={14} /> Add new address
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}
                >
                  {[
                    { key: 'label', label: 'Label (e.g. Home)', required: true },
                    { key: 'street', label: 'Street address', required: true },
                    { key: 'city', label: 'City', required: true },
                    { key: 'state', label: 'State', required: true },
                    { key: 'landmark', label: 'Landmark (optional)', required: false },
                  ].map(({ key, label, required }) => (
                    <div className="form-group" key={key}>
                      <label className="form-label">{label}</label>
                      <input
                        className="form-input"
                        placeholder={label}
                        value={newAddr[key]}
                        onChange={e => setNewAddr(a => ({ ...a, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddAddress}>Save Address</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAddingAddress(false)}>Cancel</button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Instructions */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Special Instructions</h3>
              <textarea
                className="form-input"
                placeholder="Any notes for your order or delivery rider..."
                rows={3}
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          {/* Right — Price Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            style={{ position: 'sticky', top: 'calc(var(--navbar-h) + 24px)' }}
          >
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>Price Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Subtotal', subtotal],
                  ['Delivery Fee', delivery],
                  ['Service Fee (5%)', service],
                  ['Tax (7.5%)', tax],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.9rem' }}>{formatPrice(val)}</span>
                  </div>
                ))}
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--brand-amber)' }}>
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <MapPin size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {selectedAddress
                    ? `Delivering to: ${addresses.find(a => a.id === selectedAddress)?.label || 'Selected address'}`
                    : 'No address selected'}
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                className="btn btn-primary btn-lg w-full"
                onClick={handlePlaceOrder}
                disabled={placing}
                style={{ gap: 8 }}
              >
                {placing
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  : <>Place Order & Pay <ArrowRight size={16} /></>
                }
              </motion.button>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>
                Secured by Paystack — your payment is safe
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media(max-width: 900px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
