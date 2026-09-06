/**
 * RiskScore — most prominent element on the page.
 *
 * Color bands (risk communication — kept vivid):
 *   < 30  → Green  on pale mint card
 *   30–70 → Amber  on pale yellow card
 *   > 70  → Red    on pale peach card
 *
 * Card background follows peach (featured) convention for high risk,
 * mint for low risk, and yellow for medium — matching the warm palette
 * while keeping risk colours clearly legible.
 */
export default function RiskScore({ riskScore, verdict }) {
  const getRiskTier = (score) => {
    if (score < 30) return 'low'
    if (score <= 70) return 'medium'
    return 'high'
  }

  const tier = getRiskTier(riskScore)

  const tierConfig = {
    low: {
      cardBg: '#ECFDF5',
      cardBorder: '#6EE7B7',
      ringColor: '#16a34a',       // green-600
      ringBg: '#BBF7D0',
      textColor: '#15803d',       // green-700
      badgeBg: '#D1FAE5',
      badgeBorder: '#6EE7B7',
      badgeText: '#065f46',
      subText: '#374151',
      label: 'LOWER RISK',
      sublabel: 'Likely genuine voice',
      icon: '✓',
    },
    medium: {
      cardBg: '#FFFBEB',
      cardBorder: '#FDE68A',
      ringColor: '#d97706',       // amber-600
      ringBg: '#FDE68A',
      textColor: '#b45309',       // amber-700
      badgeBg: '#FEF3C7',
      badgeBorder: '#FDE68A',
      badgeText: '#78350f',
      subText: '#374151',
      label: 'VERIFY',
      sublabel: 'Secondary verification recommended',
      icon: '⚠',
    },
    high: {
      cardBg: '#FEF2F2',
      cardBorder: '#FECACA',
      ringColor: '#dc2626',       // red-600
      ringBg: '#FECACA',
      textColor: '#b91c1c',       // red-700
      badgeBg: '#FEE2E2',
      badgeBorder: '#FECACA',
      badgeText: '#7f1d1d',
      subText: '#374151',
      label: 'HIGH RISK',
      sublabel: 'Voice clone likely detected',
      icon: '✕',
    },
  }

  const config = tierConfig[tier]

  // SVG ring progress
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (riskScore / 100) * circumference

  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center py-10"
      style={{ backgroundColor: config.cardBg, border: `1px solid ${config.cardBorder}` }}
    >
      {/* Section label */}
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C8B6E', marginBottom: '1rem' }}>
        Risk Score
      </p>

      {/* Circular progress ring */}
      <div className="relative w-48 h-48 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            strokeWidth="8"
            stroke={config.ringBg}
          />
          {/* Progress ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            stroke={config.ringColor}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Score number in centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-6xl font-black leading-none"
            style={{ color: config.textColor }}
          >
            {riskScore}
          </span>
          <span className="text-sm font-medium mt-1" style={{ color: '#9C8B6E' }}>
            / 100
          </span>
        </div>
      </div>

      {/* Risk level badge */}
      <div
        className="flex items-center gap-2 px-5 py-2 rounded-full mb-4"
        style={{
          backgroundColor: config.badgeBg,
          border: `1px solid ${config.badgeBorder}`,
        }}
      >
        <span className="text-lg" style={{ color: config.textColor }}>{config.icon}</span>
        <span className="font-bold text-sm tracking-wide" style={{ color: config.badgeText }}>
          {config.label}
        </span>
      </div>

      {/* Verdict — exact backend string, never rewritten */}
      <div className="text-center space-y-1">
        <p className="text-2xl font-black tracking-wide" style={{ color: config.textColor }}>
          {verdict}
        </p>
        <p className="text-sm" style={{ color: config.subText }}>
          {config.sublabel}
        </p>
      </div>
    </div>
  )
}
