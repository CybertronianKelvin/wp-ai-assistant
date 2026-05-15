import React, { useState } from 'react'
import { marked } from 'marked'
import { Copy, Check, Trash2, Terminal, RefreshCw, AlertTriangle, X, Loader2 } from 'lucide-react'
import { explainBug, loadDebugLog, enableDebugLog } from '../lib/api'

// Use <div> not <pre> — WP admin CSS targets <pre> with !important so we can't override it.
// Divs are untouched by WP admin styles.
const renderer = new marked.Renderer()

renderer.code = function(token) {
  const text = typeof token === 'object' ? token.text : token
  const copyFn = `(function(b){var p=b.closest('[data-code-block]');var c=p.querySelector('code');navigator.clipboard.writeText(c.innerText).then(function(){b.textContent='Copied!';setTimeout(function(){b.textContent='Copy'},2000)}).catch(function(){});})(this)`
  return `<div data-code-block style="position:relative;background:#0f172a;border-radius:10px;margin:16px 0;overflow:hidden;">
    <button onclick="${copyFn}" style="position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:5px;padding:3px 10px;font-size:11px;color:#94a3b8;cursor:pointer;font-family:inherit;z-index:1;">Copy</button>
    <code style="display:block;padding:18px 20px;color:#e2e8f0;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;line-height:1.7;overflow-x:auto;white-space:pre;">${text}</code>
  </div>`
}

renderer.codespan = function(token) {
  const text = typeof token === 'object' ? token.text : token
  return `<code style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:2px 7px;font-family:'SFMono-Regular',Consolas,monospace;font-size:0.83em;color:#0f172a;white-space:nowrap;">${text}</code>`
}

marked.use({ renderer })
marked.setOptions({ breaks: true })

// Some models wrap headings in bold: **## Title** — strip the ** so marked parses them correctly
function cleanMarkdown(text) {
  return text
    .replace(/\*\*(#{1,3}\s)/g, '$1')
    .replace(/(#{1,3}[^*\n]+)\*\*/g, '$1')
}

function parseErrorCode(err) {
  if (err.status === 401 || err.code === 'invalid_api_key') return 'auth'
  if (err.status === 429 || err.code === 'rate_limited') return 'rate'
  if (err.code === 'no_api_key') return 'no_key'
  return 'network'
}

function ResultCard({ text, onClear }) {
  const [copied, setCopied] = useState(false)

  async function copyText() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginTop: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw size={14} color="#94a3b8" />
        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>AI Explanation</span>
      </div>
      <div className="wai-prose" style={{ background: '#fff', padding: '20px 24px', lineHeight: 1.75 }}
        dangerouslySetInnerHTML={{ __html: marked(cleanMarkdown(text)) }} />
      <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', gap: 8 }}>
        <button onClick={copyText} style={copied ? btnSuccess : btnOutline}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button onClick={onClear} style={btnOutline}>
          <Trash2 size={13} /> Clear
        </button>
      </div>
    </div>
  )
}

function DebugModal({ lines, exists, source, onSelect, onEnable, isEnabling, enableError, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', width: '100%', maxWidth: 680, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Terminal size={16} color="#475569" />
            <div>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', margin: 0 }}>{source ?? 'debug.log'}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Last 100 lines — click a line to paste it</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
          {!exists ? (
            <div style={{ textAlign: 'center', padding: '36px 16px' }}>
              <Terminal size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                No debug.log found. Create it to enable WordPress error logging.
              </p>
              {enableError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{enableError}</p>}
              <button onClick={onEnable} disabled={isEnabling} style={isEnabling ? { ...btnPrimary, opacity: 0.6 } : btnPrimary}>
                {isEnabling ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Terminal size={13} />}
                {isEnabling ? 'Creating…' : 'Enable debug logging'}
              </button>
            </div>
          ) : lines.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 32 }}>Log is empty — no errors recorded yet.</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} onClick={() => onSelect(line)}
                style={{ fontSize: 11, fontFamily: 'monospace', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#334155' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >{line}</div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Shared button styles
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff',
  border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12,
  fontWeight: 600, cursor: 'pointer',
}
const btnOutline = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 12px',
  fontSize: 12, fontWeight: 500, background: '#fff', color: '#374151', cursor: 'pointer',
}
const btnSuccess = {
  ...btnOutline, background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0',
}

export default function BugExplainer({ hasApiKey }) {
  const [errorText, setErrorText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [debugLines, setDebugLines] = useState([])
  const [debugSource, setDebugSource] = useState(null)
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugExists, setDebugExists] = useState(true)
  const [isEnabling, setIsEnabling] = useState(false)
  const [enableError, setEnableError] = useState(null)
  const [validationError, setValidationError] = useState(false)

  async function handleOpenDebug() {
    try {
      const data = await loadDebugLog()
      setDebugLines(data.lines); setDebugExists(data.exists); setDebugSource(data.source ?? null)
      setShowDebugModal(true)
    } catch { setError('Could not load debug.log.') }
  }

  async function handleEnable() {
    setIsEnabling(true); setEnableError(null)
    try {
      const data = await enableDebugLog()
      setDebugLines(data.lines); setDebugExists(data.exists); setDebugSource(data.source ?? null)
    } catch (err) { setEnableError(err.message) }
    finally { setIsEnabling(false) }
  }

  function handleSelectLine(line) {
    setErrorText((prev) => (prev ? prev + '\n' + line : line))
    setShowDebugModal(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!errorText.trim()) { setValidationError(true); return }
    setValidationError(false); setIsLoading(true); setError(null); setResult(null)
    try {
      const data = await explainBug(errorText)
      setResult(data.result)
    } catch (err) {
      const type = parseErrorCode(err)
      if (type === 'auth')       setError('Invalid API key. Update it in Settings.')
      else if (type === 'rate')  setError('Rate limit hit. Wait a moment and try again.')
      else if (type !== 'no_key') setError('Connection failed. Check your internet.')
    } finally { setIsLoading(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Bug Explainer</h1>
        <p style={{ color: '#64748b', fontSize: 13.5, marginTop: 4 }}>Paste a PHP error or stack trace and get a plain-English explanation with a suggested fix.</p>
      </div>

      {!hasApiKey && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 9 }}>
          <AlertTriangle size={15} color="#d97706" />
          <span style={{ fontSize: 13, color: '#92400e' }}>Add your API key in <strong>Settings</strong> to use this tool.</span>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <label style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>Error or stack trace</label>
          <button type="button" onClick={handleOpenDebug} style={btnOutline}>
            <Terminal size={13} /> Load from debug.log
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={errorText}
            onChange={(e) => { setErrorText(e.target.value); setValidationError(false) }}
            placeholder={"PHP Fatal error: Uncaught Error: Call to undefined function get_the_tittle()\nin /wp-content/themes/my-theme/functions.php on line 42"}
            rows={8}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1px solid ${validationError ? '#fca5a5' : '#e2e8f0'}`,
              borderRadius: 8, padding: '11px 14px',
              fontSize: 12.5, fontFamily: "'SFMono-Regular', Consolas, monospace",
              lineHeight: 1.65, color: '#0f172a', background: '#f8fafc',
              resize: 'vertical', outline: 'none',
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = validationError ? '#fca5a5' : '#e2e8f0'}
          />
          {validationError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>Please enter some text first.</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <button type="submit" disabled={isLoading} style={isLoading ? { ...btnPrimary, opacity: 0.65 } : btnPrimary}>
              {isLoading
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <RefreshCw size={13} />}
              {isLoading ? 'Analysing…' : 'Explain this error'}
            </button>
            {result && (
              <button type="button" onClick={() => { setResult(null); setErrorText('') }} style={btnOutline}>
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>
        </form>

        {error && (
          <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="#b91c1c" />
            <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
          </div>
        )}
      </div>

      {result && <ResultCard text={result} onClear={() => { setResult(null); setErrorText('') }} />}

      {showDebugModal && (
        <DebugModal lines={debugLines} exists={debugExists} source={debugSource}
          onSelect={handleSelectLine} onEnable={handleEnable}
          isEnabling={isEnabling} enableError={enableError}
          onClose={() => setShowDebugModal(false)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
