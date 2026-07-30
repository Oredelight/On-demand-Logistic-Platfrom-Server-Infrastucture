import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Clock, CreditCard } from 'lucide-react'
import { orderApi, paymentApi } from '../api'
import { formatPrice, formatDate, extractError } from '../utils'
import StatusBadge from '../components/StatusBadge'
import toast from 'react-hot-toast'

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    orderApi.getOrder(id)
      .then(r => setOrder(r.data))
      .catch(e => toast.error(extractError(e)))
      .finally(() => setLoading(false))
  }, [id])

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await paymentApi.initiate(order.order_id || order.id)
      window.location.href = res.data.authorization_url
    } catch (err) {
      toast.error(extractError(err))
      setPaying(false)
    }
  }

  if (loading) return <div className="page page-loader"><div className="spinner" /></div>
  if (!order) return <div className="page page-loader"><p>Order not found</p></div>

  const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered']
  const currentIdx = STATUS_STEPS.indexOf(order.current_status?.toLowerCase())

  return (
    <div className="page">
      <div style={{ padding: '40px 0 24px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(245,158,11,0.04)' }}>
        <div className="container">
          <Link to="/orders" className="btn btn-ghost btn-sm" style={{ gap: 6, marginBottom: 16 }}>
            <ArrowLeft size={16} /> Back to orders
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)' }}>Order #{order.id}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(order.created_at)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatusBadge status={order.current_status} />
              <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                {order.payment_status === 'paid' ? '✓ Paid' : 'Awaiting Payment'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px var(--content-px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Status Timeline */}
            {order.current_status?.toLowerCase() !== 'cancelled' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 24 }}>
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 24 }}>Order Progress</h4>
                <div style={{ display: 'flex', gap: 0 }}>
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} style={{ flex: 1, position: 'relative' }}>
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{
                          position: 'absolute', top: 14, left: '50%', right: '-50%',
                          height: 2,
                          background: i < currentIdx ? 'var(--brand-amber)' : 'var(--glass-border)',
                          transition: 'background 0.3s',
                        }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: i <= currentIdx ? 'var(--brand-gradient)' : 'var(--bg-surface)',
                          border: `2px solid ${i <= currentIdx ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700,
                          color: i <= currentIdx ? '#fff' : 'var(--text-muted)',
                          position: 'relative', zIndex: 1,
                          transition: 'all 0.3s',
                        }}>
                          {i < currentIdx ? '✓' : i + 1}
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-display)',
                          fontWeight: i <= currentIdx ? 600 : 400,
                          color: i <= currentIdx ? 'var(--brand-amber)' : 'var(--text-muted)',
                          textTransform: 'capitalize',
                        }}>{step}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Items */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card" style={{ padding: 24 }}>
              <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>
                Items ({order.items?.length || order.order_items?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(order.items || order.order_items || []).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem' }}>
                        {item.food || item.food_item?.name}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {(item.protein || item.protein?.name) && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            🥩 {item.protein?.name || item.protein}
                          </span>
                        )}
                        {(item.extras || []).map((e, ei) => (
                          <span key={ei} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            +{e.name || e}
                          </span>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>×{item.quantity}</p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-amber)' }}>
                      {formatPrice(item.item_total || item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Instructions */}
            {order.instructions || order.special_instructions ? (
              <div className="glass-card" style={{ padding: 20 }}>
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Special Instructions</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {order.instructions || order.special_instructions}
                </p>
              </div>
            ) : null}
          </div>

          {/* Right — Summary */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            style={{ position: 'sticky', top: 'calc(var(--navbar-h) + 24px)', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Price breakdown */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Price Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Subtotal', order.subtotal],
                  ['Delivery Fee', order.delivery_fee],
                  ['Service Fee', order.service_fee],
                  ['Tax', order.tax],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.875rem' }}>{formatPrice(val)}</span>
                  </div>
                ))}
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--brand-amber)' }}>
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {/* Pay button if unpaid */}
              {order.payment_status !== 'paid' && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary w-full"
                  style={{ marginTop: 16, gap: 8 }}
                  onClick={handlePay}
                  disabled={paying}
                >
                  <CreditCard size={16} />
                  {paying ? 'Redirecting...' : 'Pay Now'}
                </motion.button>
              )}
            </div>

            {/* Delivery address */}
            {order.delivery_address && (
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <MapPin size={18} color="var(--brand-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem' }}>
                      {order.delivery_address.label}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {order.delivery_address.street}, {order.delivery_address.city}, {order.delivery_address.state}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
