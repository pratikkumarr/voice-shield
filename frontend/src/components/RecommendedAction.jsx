/**
 * RecommendedAction — backend-provided action string, displayed prominently.
 * No threshold logic duplicated here.
 * Warm palette: card bg matches risk tier — mint/yellow/peach.
 */
export default function RecommendedAction({ action, riskScore }) {
  const getAccent = (score) => {
    if (score < 30) return {
      cardBg: '#ECFDF5',
      cardBorder: '#6EE7B7',
      iconColor: '#15803d',
      labelColor: '#065f46',
      textColor: '#1E3A5F',
      icon: '✓',
      label: 'Recommended Action',
    }
    if (score <= 70) return {
      cardBg: '#FFFBEB',
      cardBorder: '#FDE68A',
      iconColor: '#d97706',
      labelColor: '#78350f',
      textColor: '#1E3A5F',
      icon: '⚠',
      label: 'Action Required',
    }
    return {
      cardBg: '#FEF2F2',
      cardBorder: '#FECACA',
      iconColor: '#dc2626',
      labelColor: '#7f1d1d',
      textColor: '#1E3A5F',
      icon: '🚨',
      label: 'Immediate Action Required',
    }
  }

  const accent = getAccent(riskScore)

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: accent.cardBg,
        border: `2px solid ${accent.cardBorder}`,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl" style={{ color: accent.iconColor }}>{accent.icon}</span>
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent.labelColor,
          }}
        >
          {accent.label}
        </p>
      </div>
      <p className="text-lg font-semibold leading-relaxed" style={{ color: accent.textColor }}>
        {action}
      </p>
    </div>
  )
}
