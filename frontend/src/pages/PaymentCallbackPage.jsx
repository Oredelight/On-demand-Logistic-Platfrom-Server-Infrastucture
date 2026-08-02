import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { paymentApi } from '../api'
import { useCartStore } from '../store/cartStore'

export default function PaymentCallbackPage() {
  const [params] = useSearchParams()
  const reference = params.get('reference')
  const [status, setStatus] = useState('verifying') // verifying | success | failed
  const { clearItems } = useCartStore()

  useEffect(() => {
    if (!reference) { setStatus('failed'); return }
    paymentApi.verify(reference)
      .then(r => {
        const paid = r.data.status === 'success' || r.data.payment_status === 'paid'
        if (paid) clearItems()
        setStatus(paid ? 'success' : 'failed')
      })
      .catch(() => setStatus('failed'))
  }, [reference])

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}
      >
        {status === 'verifying' && (
          <>
            <Loader size={64} color="var(--brand-amber)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
            <h2>Verifying payment...</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Please wait a moment</p>
          </>
        )}
        {status === 'success' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}>
              <CheckCircle size={72} color="var(--success)" style={{ margin: '0 auto 24px' }} />
            </motion.div>
            <h2>Payment Successful! 🎉</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 28 }}>
              Your order has been confirmed and is being prepared.
            </p>
            <Link to="/orders" className="btn btn-primary btn-lg">View My Orders</Link>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle size={72} color="var(--danger)" style={{ margin: '0 auto 24px' }} />
            <h2>Payment Failed</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 28 }}>
              Something went wrong. You can retry payment from your orders page.
            </p>
            <Link to="/orders" className="btn btn-outline btn-lg">Back to Orders</Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
