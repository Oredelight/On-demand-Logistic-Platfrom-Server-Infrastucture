export const formatPrice = (amount) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export const getStatusMeta = (status) => {
  const map = {
    pending:    { label: 'Pending',    cls: 'badge-warning' },
    processing: { label: 'Processing', cls: 'badge-info' },
    shipped:    { label: 'On the way', cls: 'badge-info' },
    delivered:  { label: 'Delivered',  cls: 'badge-success' },
    cancelled:  { label: 'Cancelled',  cls: 'badge-danger' },
  }
  return map[status?.toLowerCase()] ?? { label: status, cls: 'badge-neutral' }
}

export const extractError = (err) =>
  err?.response?.data?.detail || err?.message || 'Something went wrong'
