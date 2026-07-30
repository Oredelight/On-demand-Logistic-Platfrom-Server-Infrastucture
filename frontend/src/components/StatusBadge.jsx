import { getStatusMeta } from '../utils'

export default function StatusBadge({ status }) {
  const { label, cls } = getStatusMeta(status)
  return <span className={`badge ${cls}`}>{label}</span>
}
