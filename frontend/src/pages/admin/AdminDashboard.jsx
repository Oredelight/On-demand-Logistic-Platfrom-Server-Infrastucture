import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Package, Users, UtensilsCrossed, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { adminApi } from '../../api'
import { formatPrice, formatDate } from '../../utils'
import StatusBadge from '../../components/StatusBadge'

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.getAllOrders(), adminApi.getAllUsers()])
      .then(([oRes, uRes]) => {
        setOrders(oRes.data)
        setUsers(uRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = orders.filter(o => o.payment_status === 'success').reduce((s, o) => s + o.total, 0)
  const pending = orders.filter(o => o.status?.toLowerCase() === 'pending').length
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  const stats = [
    { icon: Package, label: 'Total Orders', value: orders.length, color: '#3b82f6', sub: `${pending} pending` },
    { icon: TrendingUp, label: 'Revenue', value: formatPrice(totalRevenue), color: '#10b981', sub: 'Paid orders' },
    { icon: Users, label: 'Users', value: users.length, color: '#f59e0b', sub: `${users.filter(u => u.is_active).length} verified` },
    { icon: UtensilsCrossed, label: 'Manage Menu', value: '→', color: '#ea580c', sub: 'Add / Edit dishes', link: '/admin/menu' },
  ]

  if (loading) return <div className="page page-loader"><div className="spinner" /></div>

  return (
    <div className="page">
      <div style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(245,158,11,0.04)' }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1><span className="gradient-text">Admin</span> Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Overview of DeliFoods operations</p>
          </motion.div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px var(--content-px)', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {stats.map(({ icon: Icon, label, value, color, sub, link }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {link ? (
                <Link to={link}>
                  <StatCard Icon={Icon} label={label} value={value} color={color} sub={sub} />
                </Link>
              ) : (
                <StatCard Icon={Icon} label={label} value={value} color={color} sub={sub} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { to: '/admin/menu', label: '🍛 Manage Menu', desc: 'Add, edit, toggle dishes' },
            { to: '/admin/orders', label: '📦 All Orders', desc: 'View and update order statuses' },
            { to: '/admin/users', label: '👥 All Users', desc: 'Manage registered users' },
          ].map(({ to, label, desc }) => (
            <Link key={to} to={to}>
              <motion.div whileHover={{ scale: 1.02 }} className="glass-card" style={{ padding: 20 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</p>
                <ArrowRight size={14} color="var(--brand-amber)" style={{ marginTop: 10 }} />
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)' }}>Recent Orders</h3>
            <Link to="/admin/orders" className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {['Order #', 'Customer', 'Total', 'Status', 'Payment', 'Date'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No orders yet
                    </td>
                  </tr>
                ) : recentOrders.map((order) => (
                  <tr key={order.order_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 12px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>#{order.order_id}</td>
                    <td style={{ padding: '12px 12px', color: 'var(--text-secondary)' }}>{order.user_email || order.user_id}</td>
                    <td style={{ padding: '12px 12px', color: 'var(--brand-amber)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatPrice(order.total)}</td>
                    <td style={{ padding: '12px 12px' }}><StatusBadge status={order.status} /></td>
                    <td style={{ padding: '12px 12px' }}>
                      <span className={`badge ${order.payment_status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {formatDate(order.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ Icon, label, value, color, sub }) {
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: color }}>{value}</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>
    </div>
  )
}
