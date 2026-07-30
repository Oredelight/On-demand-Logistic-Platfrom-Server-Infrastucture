import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Package, ChevronRight, Clock } from 'lucide-react'
import { orderApi } from '../api'
import { formatPrice, formatDate, extractError } from '../utils'
import StatusBadge from '../components/StatusBadge'
import toast from 'react-hot-toast'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    orderApi.getMyOrders()
      .then(r => setOrders(r.data))
      .catch(e => toast.error(extractError(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div style={{
        background: `linear-gradient(180deg, rgba(245,158,11,0.07) 0%, transparent 100%)`,
        padding: '48px 0 32px',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1><span className="gradient-text">My Orders</span></h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Your complete order history</p>
          </motion.div>
        </div>
      </div>

      <div className="container section">
        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <Package size={64} className="empty-state-icon" />
            <h3>No orders yet</h3>
            <p>Place your first order from our menu</p>
            <Link to="/menu" className="btn btn-primary">Browse Menu</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link to={`/orders/${order.id}`}>
                  <div className="glass-card" style={{ padding: 20, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 40, height: 40,
                            background: 'var(--brand-gradient-soft)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Package size={18} color="var(--brand-amber)" />
                          </div>
                          <div>
                            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
                              Order #{order.id}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Clock size={12} color="var(--text-muted)" />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {formatDate(order.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Items preview */}
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                          {order.order_items?.slice(0, 2).map(i => i.food_item?.name || 'Item').join(', ')}
                          {order.order_items?.length > 2 && ` +${order.order_items.length - 2} more`}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <StatusBadge status={order.current_status} />
                          <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                            {order.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--brand-amber)' }}>
                          {formatPrice(order.total)}
                        </p>
                        <ChevronRight size={18} color="var(--text-muted)" style={{ marginTop: 8 }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
