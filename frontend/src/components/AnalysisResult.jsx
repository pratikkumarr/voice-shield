/**
 * AnalysisResult — full details panel.
 * Warm palette: white cards with beige/gold borders.
 * Detection signals card gets a pale yellow accent.
 * Metadata card is plain white.
 */
export default function AnalysisResult({ result }) {
  const { confidence, flags, latency_ms, timestamp, audit_hash } = result

  const hasFlags = Array.isArray(flags) && flags.length > 0

  const formatTimestamp = (ts) => {
    if (!ts) return '—'
    try {
      return new Date(ts).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    } catch {
      return ts
    }
  }

  const formatConfidence = (c) => {
    if (c == null) return '—'
    return `${Math.round(c * 100)}%`
  }

  // Keep vivid colours for confidence so urgency is still communicated
  const getConfidenceColor = (c) => {
    if (c == null) return '#6B7280'
    if (c >= 0.8) return '#dc2626'   // red
    if (c >= 0.6) return '#d97706'   // amber
    return '#16a34a'                  // green
  }

  return (
    <div className="space-y-4">

      {/* Detection Signals — pale yellow card */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#FEFCE8', border: '1px solid #FDE68A' }}
      >
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#92400E', marginBottom: '1rem' }}>
          🔍 Detection Signals
        </p>

        {hasFlags ? (
          <ul className="space-y-2">
            {flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#374151' }}>
                <span className="mt-0.5 shrink-0" style={{ color: '#d97706' }}>•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic" style={{ color: '#9C8B6E' }}>
            No specific detection flags reported.
          </p>
        )}
      </div>

      {/* Metadata — white card with beige/gold border */}
      <div className="card">
        <p className="card-header flex items-center gap-2">
          <span>📊</span> Analysis Metadata
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Confidence */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#FAF8F3', border: '1px solid #D4C5A0' }}
          >
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C8B6E', marginBottom: '0.25rem' }}>
              Confidence
            </p>
            <p className="text-2xl font-bold" style={{ color: getConfidenceColor(confidence) }}>
              {formatConfidence(confidence)}
            </p>
          </div>

          {/* Latency */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#FAF8F3', border: '1px solid #D4C5A0' }}
          >
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C8B6E', marginBottom: '0.25rem' }}>
              Inference Latency
            </p>
            <p className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
              {latency_ms != null ? `${latency_ms} ms` : '—'}
            </p>
          </div>

          {/* Timestamp */}
          <div
            className="rounded-xl p-4 sm:col-span-2"
            style={{ backgroundColor: '#FAF8F3', border: '1px solid #D4C5A0' }}
          >
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C8B6E', marginBottom: '0.25rem' }}>
              Analysis Timestamp
            </p>
            <p className="text-sm font-medium font-mono" style={{ color: '#2D3748' }}>
              {formatTimestamp(timestamp)}
            </p>
          </div>

          {/* Audit Hash */}
          <div
            className="rounded-xl p-4 sm:col-span-2"
            style={{ backgroundColor: '#FAF8F3', border: '1px solid #D4C5A0' }}
          >
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C8B6E', marginBottom: '0.5rem' }}>
              Audit Hash
            </p>
            <code
              className="text-xs font-mono break-all block px-3 py-2 rounded-lg"
              style={{ backgroundColor: '#F3EFE4', color: '#1E3A5F', border: '1px solid #D4C5A0' }}
            >
              {audit_hash || '—'}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
