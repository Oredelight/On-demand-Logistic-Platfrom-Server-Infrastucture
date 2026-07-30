import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Eye, EyeOff, X, Check, UtensilsCrossed } from 'lucide-react'
import { foodApi, adminApi } from '../../api'
import { formatPrice, extractError } from '../../utils'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', description: '', price: '', image_url: '' }

export default function AdminMenuPage() {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    foodApi.getFoods()
      .then(r => setFoods(r.data))
      .finally(() => setLoading(false))
  }, [])

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }

  const openEdit = (food) => {
    setForm({ name: food.name, description: food.description || '', price: food.price, image_url: food.image_url || '' })
    setEditingId(food.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return }
    setSaving(true)
    try {
      if (editingId) {
        const res = await adminApi.updateFood(editingId, { ...form, price: parseFloat(form.price), available: true })
        setFoods(f => f.map(x => x.id === editingId ? { ...x, ...res.data } : x))
        toast.success('Food item updated!')
      } else {
        const res = await adminApi.addFood({ ...form, price: parseFloat(form.price) })
        // Refresh list
        const list = await foodApi.getFoods()
        setFoods(list.data)
        toast.success('Food item added!')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (food) => {
    try {
      await adminApi.toggleAvailability(food.id, !food.available)
      setFoods(f => f.map(x => x.id === food.id ? { ...x, available: !x.available } : x))
      toast.success(`${food.name} marked as ${!food.available ? 'available' : 'unavailable'}`)
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '48px 0 32px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(245,158,11,0.04)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1><span className="gradient-text">Menu</span> Management</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{foods.length} items total</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" style={{ gap: 6 }} onClick={openAdd}>
              <Plus size={16} /> Add Item
            </motion.button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '32px var(--content-px)' }}>
        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : foods.length === 0 ? (
          <div className="empty-state">
            <UtensilsCrossed size={56} className="empty-state-icon" />
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 8 }}>No menu items yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click "Add Item" above to add your first dish.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {foods.map((food, i) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${food.available ? 'var(--glass-border)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  opacity: food.available ? 1 : 0.7,
                }}
              >
                <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={food.image_url || `https://picsum.photos/seed/food${food.id}/400/260`}
                    alt={food.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = `https://picsum.photos/seed/food${food.id}/400/260` }}
                  />
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: food.available ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                    color: '#fff', padding: '3px 10px',
                    borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                  }}>
                    {food.available ? 'Available' : 'Unavailable'}
                  </div>
                </div>

                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>{food.name}</p>
                    <span style={{ color: 'var(--brand-amber)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, marginLeft: 8 }}>
                      {formatPrice(food.price)}
                    </span>
                  </div>
                  {food.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {food.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" style={{ gap: 4, flex: 1 }} onClick={() => openEdit(food)}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button className={`btn btn-sm ${food.available ? 'btn-danger' : 'btn-outline'}`} style={{ gap: 4, flex: 1 }} onClick={() => handleToggle(food)}>
                      {food.available ? <><EyeOff size={13} /> Disable</> : <><Eye size={13} /> Enable</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} />
            <motion.div className="modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-display)' }}>{editingId ? 'Edit Food Item' : 'Add New Item'}</h3>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowForm(false)}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'name', label: 'Food Name *', type: 'text', ph: 'e.g. Jollof Rice' },
                  { key: 'price', label: 'Price (₦) *', type: 'number', ph: '1500' },
                  { key: 'image_url', label: 'Image URL', type: 'url', ph: 'https://...' },
                ].map(({ key, label, type, ph }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" type={type} placeholder={ph}
                      value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} placeholder="Describe this dish..."
                    style={{ resize: 'none' }}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary" style={{ flex: 1, gap: 6 }} onClick={handleSave} disabled={saving}>
                    {saving ? <><div className="spinner spinner-sm" /> Saving...</> : <><Check size={16} /> {editingId ? 'Update' : 'Add Item'}</>}
                  </motion.button>
                  <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
