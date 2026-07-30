import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import { adminApi } from '../../api'
import { formatDate, extractError } from '../../utils'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getAllUsers()
      .then(r => { setUsers(r.data); setFiltered(r.data) })
      .catch(e => toast.error(extractError(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.phone_number?.includes(q) ||
      u.referral_code?.toLowerCase().includes(q)
    ))
  }, [search, users])

  return (
    <div className="page">
      <div style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(245,158,11,0.04)' }}>
        <div className="container">
          <h1><span className="gradient-text">All Users</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{users.length} registered users</p>

          <div style={{ position: 'relative', maxWidth: 400, marginTop: 20 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search by email, phone or referral..."
              style={{ paddingLeft: 40 }} value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px var(--content-px)' }}>
        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={56} className="empty-state-icon" />
            <p>No users found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)' }}>
                    {['ID', 'Email', 'Phone', 'Role', 'Status', 'Referral Code', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, i) => (
                    <motion.tr key={user.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>#{user.id}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {user.phone_number || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-neutral'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {user.is_active ? 'Active' : 'Unverified'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--brand-amber)' }}>
                        {user.referral_code}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(user.created_at)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
