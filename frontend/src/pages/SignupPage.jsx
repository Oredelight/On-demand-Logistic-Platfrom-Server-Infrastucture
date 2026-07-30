import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Phone, UtensilsCrossed, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'
import { authApi } from '../api'
import { extractError } from '../utils'
import toast from 'react-hot-toast'

// ── Step 1: Registration Form ──────────────────────────────────
function RegisterStep({ onSuccess }) {
  const [form, setForm] = useState({ email: '', phone_number: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email && !form.phone_number) e.email = 'Email or phone number is required'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const payload = { password: form.password }
      if (form.email) payload.email = form.email
      if (form.phone_number) payload.phone_number = form.phone_number
      await authApi.signup(payload)
      toast.success('Account created! Check your email for the OTP.')
      onSuccess(form.email)
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="form-group">
        <label className="form-label">Email address</label>
        <div style={{ position: 'relative' }}>
          <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className={`form-input ${errors.email ? 'error' : ''}`}
            type="email" placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={{ paddingLeft: 40 }}
          />
        </div>
        {errors.email && <p className="form-error">{errors.email}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Phone number <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
        <div style={{ position: 'relative' }}>
          <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            type="tel" placeholder="+2348012345678"
            value={form.phone_number}
            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className={`form-input ${errors.password ? 'error' : ''}`}
            type={showPw ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ paddingLeft: 40, paddingRight: 44 }}
          />
          <button type="button"
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={() => setShowPw(!showPw)}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="form-error">{errors.password}</p>}
      </div>

      {/* Password strength */}
      {form.password && (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {[1,2,3,4].map(n => (
              <div key={n} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: form.password.length >= n * 3
                  ? n <= 1 ? '#ef4444' : n <= 2 ? '#f59e0b' : n <= 3 ? '#3b82f6' : '#10b981'
                  : 'var(--glass-border)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {form.password.length < 4 ? 'Weak' : form.password.length < 7 ? 'Fair' : form.password.length < 10 ? 'Good' : 'Strong'}
          </p>
        </div>
      )}

      <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
        {loading ? <><div className="spinner spinner-sm" /> Creating account...</> : 'Create Account'}
      </motion.button>
    </form>
  )
}

// ── Step 2: OTP Verification ───────────────────────────────────
function OtpStep({ email, onSuccess }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const handleChange = (i, v) => {
    const next = [...otp]
    next[i] = v.slice(-1)
    setOtp(next)
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the full 6-digit code'); return }
    setLoading(true)
    try {
      await authApi.verifyOtp({ email, otp: code })
      toast.success('Email verified! You can now log in.')
      onSuccess()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await authApi.resendOtp(email)
      toast.success('A new OTP has been sent')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
      <div style={{
        width: 64, height: 64,
        background: 'var(--success-bg)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ShieldCheck size={30} color="var(--success)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-display)' }}>Check your email</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>
          We sent a 6-digit code to <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>
        </p>
      </div>

      {/* OTP inputs */}
      <div style={{ display: 'flex', gap: 10 }}>
        {otp.map((v, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={v}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            style={{
              width: 48, height: 56,
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              background: v ? 'rgba(245,158,11,0.1)' : 'var(--bg-input)',
              border: `2px solid ${v ? 'var(--brand-amber)' : 'var(--glass-border)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
          />
        ))}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary btn-lg w-full" onClick={handleVerify} disabled={loading}>
        {loading ? <><div className="spinner spinner-sm" /> Verifying...</> : 'Verify Email'}
      </motion.button>

      <button className="btn btn-ghost" onClick={handleResend} disabled={resending} style={{ fontSize: '0.875rem' }}>
        {resending ? 'Resending...' : "Didn't get it? Resend OTP"}
      </button>
    </div>
  )
}

// ── Main SignupPage ────────────────────────────────────────────
export default function SignupPage() {
  const [step, setStep] = useState('register') // 'register' | 'otp'
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  return (
    <div className="page" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,158,11,0.1) 0%, transparent 60%), var(--bg-base)`,
      padding: '24px 16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--brand-gradient)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: 'var(--shadow-brand)',
          }}>
            <UtensilsCrossed size={28} color="#fff" />
          </div>
          <h2>
            {step === 'register' ? 'Create your account' : 'Verify your email'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>
            {step === 'register' ? 'Join DeliFoods and order in seconds' : 'Almost there!'}
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 32,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {['Account', 'Verify'].map((label, i) => (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{
                  height: 3, borderRadius: 2,
                  background: (i === 0 || step === 'otp') ? 'var(--brand-amber)' : 'var(--glass-border)',
                  transition: 'background 0.3s',
                }} />
                <span style={{ fontSize: '0.7rem', color: (i === 0 || step === 'otp') ? 'var(--brand-amber)' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 'register' ? (
              <motion.div key="register" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <RegisterStep onSuccess={(em) => { setEmail(em); setStep('otp') }} />
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <OtpStep email={email} onSuccess={() => navigate('/login')} />
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 16, gap: 6 }} onClick={() => setStep('register')}>
                  <ArrowLeft size={14} /> Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--brand-amber)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
