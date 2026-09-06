import { useRef, useState, useCallback } from 'react'

/**
 * AudioInput component — warm peach/light orange section background.
 */
export default function AudioInput({ onAnalyze, isAnalyzing }) {
  const [mode, setMode] = useState('upload')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [mediaError, setMediaError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const fileInputRef = useRef(null)

  const readyAudio = mode === 'upload' ? selectedFile : recordedBlob

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) { setSelectedFile(f); setMediaError(null) }
  }

  const startRecording = useCallback(async () => {
    setMediaError(null)
    setRecordedBlob(null)
    setRecordingSeconds(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current)
      }

      recorder.start(100)
      setIsRecording(true)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch (err) {
      setMediaError(
        err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone permissions.'
          : `Could not access microphone: ${err.message}`
      )
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }, [isRecording])

  const handleAnalyze = () => {
    if (readyAudio && !isAnalyzing) onAnalyze(readyAudio)
  }

  const formatSeconds = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const mediaRecorderSupported = typeof window !== 'undefined' && !!window.MediaRecorder

  return (
    /* Peach / light orange card surface for the audio input section */
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{ backgroundColor: '#FDF0E8', border: '1px solid #F4C3A0' }}
    >
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C6B40', marginBottom: 0 }}>
        🎙 Audio Input
      </p>

      {/* Mode toggle */}
      <div
        className="flex rounded-xl overflow-hidden w-fit"
        style={{ border: '1px solid #F4C3A0' }}
      >
        {['upload', 'record'].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setMediaError(null) }}
            disabled={isAnalyzing || (m === 'record' && !mediaRecorderSupported)}
            style={
              mode === m
                ? { backgroundColor: '#1E3A5F', color: '#FFFFFF' }
                : { backgroundColor: '#FFF7F2', color: '#7C5C3E' }
            }
            className="px-5 py-2.5 text-sm font-medium transition-colors"
            title={m === 'record' && !mediaRecorderSupported ? 'MediaRecorder not supported in this browser' : ''}
          >
            {m === 'upload' ? 'Upload File' : 'Record Audio'}
          </button>
        ))}
      </div>

      {/* Upload panel */}
      {mode === 'upload' && (
        <div>
          <div
            className="rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{
              border: '2px dashed #F4C3A0',
              backgroundColor: '#FFF7F2',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#1E3A5F'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#F4C3A0'}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-2">📁</div>
            <p className="font-medium" style={{ color: '#4A3728' }}>
              {selectedFile ? selectedFile.name : 'Click to select an audio file'}
            </p>
            <p className="text-sm mt-1" style={{ color: '#9C7A5E' }}>
              WAV, MP3, FLAC, OGG, M4A, WEBM accepted
            </p>
            {selectedFile && (
              <p className="text-sm mt-2" style={{ color: '#1E3A5F', fontWeight: 600 }}>
                ✓ {(selectedFile.size / 1024).toFixed(1)} KB ready
              </p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isAnalyzing}
          />
        </div>
      )}

      {/* Record panel */}
      {mode === 'record' && (
        <div className="space-y-4">
          {!mediaRecorderSupported && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
              MediaRecorder is not supported in this browser. Please use Chrome, Firefox, or Edge.
            </div>
          )}
          {mediaError && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
            >
              {mediaError}
            </div>
          )}

          <div className="flex items-center gap-4">
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 record-pulse" />
                <span className="text-red-600 font-mono text-sm font-medium">
                  REC {formatSeconds(recordingSeconds)}
                </span>
              </div>
            )}
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isAnalyzing || !mediaRecorderSupported}
                className="btn-red flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-700 inline-block" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="btn-slate flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded inline-block" style={{ backgroundColor: '#374151' }} />
                Stop Recording
              </button>
            )}
          </div>

          {recordedBlob && !isRecording && (
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7' }}
            >
              <span className="text-green-600 text-lg">✓</span>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1E3A5F' }}>Recording complete</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {(recordedBlob.size / 1024).toFixed(1)} KB · {formatSeconds(recordingSeconds)} recorded
                </p>
              </div>
              <audio controls src={URL.createObjectURL(recordedBlob)} className="ml-auto h-8" />
            </div>
          )}
        </div>
      )}

      {/* Analyze button — deep navy */}
      <div className="pt-1">
        <button
          onClick={handleAnalyze}
          disabled={!readyAudio || isAnalyzing}
          className="w-full flex items-center justify-center gap-3 py-4 text-base rounded-xl font-semibold transition-all"
          style={
            !readyAudio || isAnalyzing
              ? { backgroundColor: '#93A8C2', color: '#FFFFFF', cursor: 'not-allowed' }
              : { backgroundColor: '#1E3A5F', color: '#FFFFFF' }
          }
          onMouseEnter={e => { if (readyAudio && !isAnalyzing) e.currentTarget.style.backgroundColor = '#244876' }}
          onMouseLeave={e => { if (readyAudio && !isAnalyzing) e.currentTarget.style.backgroundColor = '#1E3A5F' }}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing Voice...
            </>
          ) : (
            <>
              <span>🛡</span>
              Analyze Voice
            </>
          )}
        </button>
        {!readyAudio && !isAnalyzing && (
          <p className="text-xs text-center mt-2" style={{ color: '#9C7A5E' }}>
            {mode === 'upload' ? 'Select an audio file to begin' : 'Record audio to begin'}
          </p>
        )}
      </div>
    </div>
  )
}
