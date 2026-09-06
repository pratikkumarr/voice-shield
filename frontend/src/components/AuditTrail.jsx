import { useEffect, useState, useCallback } from 'react'
import { fetchAuditHistory } from '../api/analyze'

/**
 * AuditTrail — warm-themed blockchain audit history panel.
 * Calls GET http://localhost:8000/audit/history
 * Gracefully handles 404 / network errors.
 */
export default function AuditTrail() {
  const [state, setState] = useState('loading')
  const [entries, setEntries] = useState([])
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const load = useCallback(async () => {
    setState('loading')
    const data = await fetchAuditHistory()

    if (data === null) {
      setState('empty')
    } else if (data.length === 0) {
      setState('data')
      setEntries([])
    } else {
      setState('data')
      setEntries(data)
    }
    setLastRefreshed(new Date())
  }, [])

  useEffect(() => { load() }, [load])

  const getRiskColor = (score) => {
    if (score == null) return '#9C8B6E'
    if (score < 30) return '#16a34a'
    if (score <= 70) return '#d97706'
    return '#dc2626'
  }

  const formatTimestamp = (ts) => {
    if (!ts) return '—'
    try {
      return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    } catch { return ts }
  }

  const truncateHash = (hash) => {
    if (!hash) return '—'
    if (hash.length <= 20) return hash
    return `${hash.slice(0, 10)}…${hash.slice(-8)}`
  }

  return (
    /* White card with beige/gold border — same as metadata cards */
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <p className="card-header flex items-center gap-2 mb-0">
          <span>⛓</span> Audit Trail
        </p>
        <button
          onClick={load}
          disabled={state === 'loading'}
          className="text-xs flex items-center gap-1.5 transition-colors"
          style={{ color: '#1E3A5F', fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.color = '#244876'}
          onMouseLeave={e => e.currentTarget.style.color = '#1E3A5F'}
          title="Refresh audit trail"
        >
          {state === 'loading' ? (
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : '↻'}
          Refresh
        </button>
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className="flex items-center gap-3 py-6" style={{ color: '#9C8B6E' }}>
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading audit history…</span>
        </div>
      )}

      {/* Empty / 404 */}
      {state === 'empty' && (
        <div className="py-6 text-center space-y-2">
          <p className="text-sm" style={{ color: '#9C8B6E' }}>
            No audit records available yet.
          </p>
          <p className="text-xs" style={{ color: '#B8A87A' }}>
            The audit trail will populate once the blockchain ledger endpoint is active.
          </p>
          <div
            className="mt-3 inline-flex items-center gap-2 text-xs rounded-lg px-3 py-1.5"
            style={{
              backgroundColor: '#FAF8F3',
              border: '1px solid #D4C5A0',
              color: '#9C8B6E',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#D4C5A0' }} />
            <code>GET /audit/history</code>
            <span>not yet available</span>
          </div>
        </div>
      )}

      {/* Empty ledger */}
      {state === 'data' && entries.length === 0 && (
        <p className="text-sm py-4 text-center" style={{ color: '#9C8B6E' }}>
          No audit records found in ledger.
        </p>
      )}

      {/* Data table */}
      {state === 'data' && entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #D4C5A0' }}>
                {['Hash', 'Timestamp', 'Risk'].map((h, i) => (
                  <th
                    key={h}
                    className={`pb-3 ${i === 2 ? 'text-right' : 'text-left pr-4'}`}
                    style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C8B6E' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid #F3EFE4' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF8F3'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <td className="py-3 pr-4">
                    <code className="text-xs font-mono" style={{ color: '#1E3A5F' }}>
                      {truncateHash(entry.hash || entry.audit_hash)}
                    </code>
                    {entry.prev_hash && (
                      <div className="text-xs font-mono mt-0.5" style={{ color: '#B8A87A' }}>
                        prev: {truncateHash(entry.prev_hash)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs" style={{ color: '#6B7280' }}>
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td className="py-3 text-right font-bold font-mono" style={{ color: getRiskColor(entry.risk_score) }}>
                    {entry.risk_score != null ? entry.risk_score : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {lastRefreshed && (
            <p className="text-xs mt-3" style={{ color: '#B8A87A' }}>
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
