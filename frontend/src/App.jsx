import { useState, useCallback } from 'react'
import AudioInput from './components/AudioInput'
import RiskScore from './components/RiskScore'
import RecommendedAction from './components/RecommendedAction'
import AnalysisResult from './components/AnalysisResult'
import AuditTrail from './components/AuditTrail'
import { analyzeAudio } from './api/analyze'

export default function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = useCallback(async (file) => {
    // Clear previous result immediately so stale data is never visible
    setResult(null)
    setError(null)
    setIsAnalyzing(true)

    try {
      const data = await analyzeAudio(file)
      setResult(data)
    } catch (err) {
      console.error('[Analyze] error:', err)
      setError(
        err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
          ? 'Unable to reach the backend. Make sure the FastAPI server is running at http://localhost:8000.'
          : `Analysis failed: ${err.message || 'Unknown error'}`
      )
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return (
    /* Soft cream/off-white page background */
    <div className="min-h-screen" style={{ backgroundColor: '#FAF8F3' }}>

      {/* ── Header / Nav — deep navy ── */}
      <header style={{ backgroundColor: '#1E3A5F' }} className="sticky top-0 z-10 shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          {/* Shield logo */}
          <div className="w-9 h-9 shrink-0">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M50 5L90 20L90 50C90 72 72 90 50 95C28 90 10 72 10 50L10 20Z"
                fill="rgba(255,255,255,0.15)"
                stroke="#FEFCE8"
                strokeWidth="3"
              />
              <path
                d="M36 50L46 60L65 40"
                stroke="#FEFCE8"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              SentinelVoice
            </h1>
            <p className="text-xs font-medium tracking-wide" style={{ color: '#BBCFE8' }}>
              Real-Time Voice Authenticity &amp; Risk Detection · SIH26104
            </p>
          </div>

          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#86EFAC' }}
            />
            <span className="text-xs font-medium" style={{ color: '#BBF7D0' }}>
              Live Analysis
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero strip — pale yellow ── */}
      <div style={{ backgroundColor: '#FEFCE8', borderBottom: '1px solid #FDE68A' }}>
        <div className="max-w-5xl mx-auto px-6 py-5">
          <p className="text-sm font-medium" style={{ color: '#92400E' }}>
            🛡&nbsp; AI-powered voice spoofing &amp; deepfake detection for secure identity verification
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Audio Input — peach/light orange section ── */}
        <AudioInput onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />

        {/* ── Analyzing state — mint green strip ── */}
        {isAnalyzing && (
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-5"
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #6EE7B7',
            }}
          >
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full border-4 animate-spin"
                style={{ borderColor: '#D1FAE5', borderTopColor: '#1E3A5F' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl">🎙</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-lg" style={{ color: '#1E3A5F' }}>
                Analyzing Voice…
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Running spectral analysis and anti-spoofing inference
              </p>
            </div>
            {/* Animated signal bars */}
            <div className="flex items-end gap-1 h-8">
              {[2, 4, 6, 8, 5, 3, 7, 4, 6, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full animate-pulse"
                  style={{
                    height: `${h * 4}px`,
                    backgroundColor: '#1E3A5F',
                    opacity: 0.5,
                    animationDelay: `${i * 80}ms`,
                    animationDuration: '900ms',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {error && !isAnalyzing && (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl shrink-0">⚠</span>
              <div className="space-y-1">
                <p className="font-semibold text-red-700">Analysis Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && !isAnalyzing && (
          <>
            {/* Section divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px" style={{ backgroundColor: '#D4C5A0' }} />
              <span
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: '#9C8B6E' }}
              >
                Analysis Results
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#D4C5A0' }} />
            </div>

            {/* Risk Score — most prominent element */}
            <RiskScore riskScore={result.risk_score} verdict={result.verdict} />

            {/* Recommended Action */}
            <RecommendedAction action={result.recommended_action} riskScore={result.risk_score} />

            {/* Full analysis details */}
            <AnalysisResult result={result} />
          </>
        )}

        {/* ── Audit Trail section divider ── */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex-1 h-px" style={{ backgroundColor: '#D4C5A0' }} />
          <span
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: '#9C8B6E' }}
          >
            Blockchain Audit Trail
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#D4C5A0' }} />
        </div>

        <AuditTrail />

        {/* ── Footer ── */}
        <footer className="text-center pt-4 pb-8 space-y-1">
          <p className="text-xs" style={{ color: '#9C8B6E' }}>
            SentinelVoice · SIH26104 · AI-Powered Voice Fraud Prevention
          </p>
          <p className="text-xs" style={{ color: '#B8A87A' }}>
            Raw audio is not persisted after analysis · Only derived feature hashes enter the audit ledger
          </p>
        </footer>
      </main>
    </div>
  )
}
