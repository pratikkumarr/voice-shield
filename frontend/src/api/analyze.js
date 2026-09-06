const BASE_URL = 'http://localhost:8000'

/**
 * POST /analyze — sends audio file/blob to the backend.
 * @param {File|Blob} file
 * @returns {Promise<Object>} analysis result
 */
export async function analyzeAudio(file) {
  const formData = new FormData()
  // Always ensure the file has a filename so the backend can detect extension
  const audioFile = file instanceof File
    ? file
    : new File([file], 'recording.wav', { type: file.type || 'audio/wav' })
  formData.append('file', audioFile)

  // Do NOT set Content-Type header — let the browser set multipart boundary automatically
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Backend returned ${response.status}${text ? ': ' + text : ''}`)
  }

  return response.json()
}

/**
 * GET /audit/history — fetches the blockchain audit trail.
 * Returns null (not throws) when the endpoint is unavailable (404, network error, etc.)
 * so the AuditTrail component can show a clean empty state.
 * @returns {Promise<Array|null>}
 */
export async function fetchAuditHistory() {
  try {
    const response = await fetch(`${BASE_URL}/audit/history`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (response.status === 404) {
      // Endpoint not yet implemented — expected at this project stage
      return null
    }

    if (!response.ok) {
      console.warn(`[AuditHistory] HTTP ${response.status} — showing empty state`)
      return null
    }

    const data = await response.json()
    // Normalise: backend may return array directly or { history: [...] }
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.history)) return data.history
    if (data && Array.isArray(data.records)) return data.records
    return []
  } catch (err) {
    // Network error (backend not running, CORS, etc.)
    console.warn('[AuditHistory] fetch failed:', err.message)
    return null
  }
}
