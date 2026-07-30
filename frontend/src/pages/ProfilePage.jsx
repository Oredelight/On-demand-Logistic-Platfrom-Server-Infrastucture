import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Plus, Trash2, Star } from 'lucide-react'
import { authApi, addressApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { formatDate, extractError } from '../utils'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [addingAddress, setAddingAddress] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: '', street: '', city: '', state: '', landmark: '' })

  useEffect(() => {
    Promise.all([authApi.getProfile(), addressApi.list()])
      .then(([pRes, aRes]) => {
        setProfile(pRes.data)
        setUser(pRes.data)
        setAddresses(aRes.data)
      })
      .finally(() => setLoadingProfile(false))
  }, [])

  const handleAddAddress = async () => {
    if (!newAddr.label || !newAddr.street || !newAddr.city || !newAddr.state) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      const res = await addressApi.add(newAddr)
      setAddresses(a => [...a, res.data])
      setNewAddr({ label: '', street: '', city: '', state: '', landmark: '' })
      setAddingAddress(false)
      toast.success('Address saved!')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const handleRemoveAddress = async (id) => {
    try {
      await addressApi.remove(id)
      setAddresses(a => a.filter(x => x.id !== id))
      toast.success('Address removed')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await addressApi.setDefault(id)
      setAddresses(a => a.map(x => ({ ...x, is_default: x.id === id })))
      toast.success('Default address updated')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  if (loadingProfile) return <div className="page page-loader"><div className="spinner" /></div>

  return (
    <div className="page">
      <div style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(245,158,11,0.04)' }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 20 }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', boxShadow: 'var(--shadow-brand)',
              flexShrink: 0,
            }}>
              {profile?.email?.[0]?.toUpperCase() || '👤'}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)' }}>
                {profile?.email?.split('@')[0] || 'My Account'}
              </h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span className={`badge ${profile?.role === 'admin' ? 'badge-warning' : 'badge-neutral'}`}>
                  {profile?.role || 'customer'}
                </span>
                {profile?.is_active && <span className="badge badge-success">Verified</span>}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px var(--content-px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Profile Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>Account Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: Mail, label: 'Email', value: profile?.email || '—' },
                { icon: Phone, label: 'Phone', value: profile?.phone_number || '—' },
                { icon: User, label: 'Role', value: profile?.role || '—' },
                { icon: Star, label: 'Referral Code', value: profile?.referral_code || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{
                    width: 36, height: 36,
                    background: 'var(--brand-gradient-soft)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={16} color="var(--brand-amber)" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500, textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', marginTop: 1 }}>{value}</p>
                  </div>
                </div>
              ))}

              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500, textTransform: 'uppercase', marginBottom: 4 }}>
                  Member Since
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {formatDate(profile?.created_at)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Addresses */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)' }}>Delivery Addresses</h3>
              <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={() => setAddingAddress(!addingAddress)}>
                <Plus size={14} /> Add
              </button>
            </div>

            {/* New address form */}
            {addingAddress && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ overflow: 'hidden', marginBottom: 16 }}
              >
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'label', label: 'Label *', ph: 'e.g. Home, Office' },
                    { key: 'street', label: 'Street *', ph: '123 Main Street' },
                    { key: 'city', label: 'City *', ph: 'Lagos' },
                    { key: 'state', label: 'State *', ph: 'Lagos State' },
                    { key: 'landmark', label: 'Landmark', ph: 'Near the blue bridge' },
                  ].map(({ key, label, ph }) => (
                    <div className="form-group" key={key} style={{ gap: 4 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>{label}</label>
                      <input className="form-input" placeholder={ph}
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        value={newAddr[key]}
                        onChange={e => setNewAddr(a => ({ ...a, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddAddress}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAddingAddress(false)}>Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}

            {addresses.length === 0 ? (
              <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
                <MapPin size={40} className="empty-state-icon" />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No addresses saved yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {addresses.map(addr => (
                  <div key={addr.id} style={{
                    padding: '14px 16px',
                    background: 'var(--bg-surface)',
                    border: `1px solid ${addr.is_default ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem' }}>{addr.label}</p>
                          {addr.is_default && <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>Default</span>}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {addr.street}, {addr.city}, {addr.state}
                        </p>
                        {addr.landmark && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Near: {addr.landmark}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {!addr.is_default && (
                          <button className="btn btn-ghost btn-icon btn-sm" title="Set as default" onClick={() => handleSetDefault(addr.id)}>
                            <Star size={14} />
                          </button>
                        )}
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleRemoveAddress(addr.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
