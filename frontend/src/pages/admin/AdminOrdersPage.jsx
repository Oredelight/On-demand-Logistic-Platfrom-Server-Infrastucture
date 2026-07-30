import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, ChevronDown } from 'lucide-react'
import { adminApi } from '../../api'
import { formatPrice, formatDate, extractError } from '../../utils'
import StatusBadge from '../../components/StatusBadge'
import toast from 'react-hot-toast'

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    adminApi.getAllOrders()
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      await adminApi.updateOrderStatus(orderId, newStatus)
      setOrders(o => o.map(x => x.id === orderId ? { ...x, current_status: newStatus } : x))
      toast.success(`Order #${orderId} → ${newStatus}`)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status?.toLowerCase() === filter)

  return (
    <div className="page">
      <div style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(245,158,11,0.04)' }}>
        <div className="container">
          <h1><span className="gradient-text">All Orders</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{orders.length} total orders</p>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            {['all', ...STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px var(--content-px)' }}>
        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No orders in this category</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card"
                style={{ padding: '18px 20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {/* Order ID */}
                  <div style={{ minWidth: 80 }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>#{order.id}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Clock size={11} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatDate(order.created_at)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {order.items?.slice(0, 2).map(i => i.food || 'Item').join(', ')}
                      {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                    </p>
                  </div>

                  {/* Price */}
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-amber)', minWidth: 90, textAlign: 'right' }}>
                    {formatPrice(order.total)}
                  </span>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <StatusBadge status={order.status} />
                    <span className={`badge ${order.payment_status === 'success' ? 'badge-success' : 'badge-warning'}`}>
                      {order.payment_status}
                    </span>
                  </div>

                  {/* Status selector */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <select
                      value={order.status?.toLowerCase() || 'pending'}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                      style={{
                        appearance: 'none',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 32px 6px 12px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        outline: 'none',
                        minWidth: 130,
                      }}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} style={{ background: 'var(--bg-card)', textTransform: 'capitalize' }}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    {updatingId === order.id && (
                      <div className="spinner spinner-sm" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
