import React, { useState } from 'react'
import { marked } from 'marked'
import { Copy, Check, RefreshCw, FileEdit, Eye, Pencil, AlertTriangle, Loader2, ExternalLink, FilePlus, Zap, ChevronDown } from 'lucide-react'
import { generateContent } from '../lib/api'

marked.setOptions({ breaks: true })

const CONTENT_TYPES = [
  { value: 'blog_post',           label: 'Full blog post' },
  { value: 'blog_post_intro',     label: 'Blog post intro' },
  { value: 'product_description', label: 'Product description' },
  { value: 'social_caption',      label: 'Social caption (Twitter/LinkedIn)' },
  { value: 'page_intro',          label: 'Page intro paragraph' },
  { value: 'email',               label: 'Email newsletter' },
]

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual',       label: 'Casual' },
  { value: 'persuasive',   label: 'Persuasive' },
  { value: 'friendly',     label: 'Friendly' },
  { value: 'formal',       label: 'Formal' },
]

const selectStyle = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '8px 12px', fontSize: 13, color: '#0f172a',
  background: '#f8fafc', outline: 'none', cursor: 'pointer',
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '9px 14px', fontSize: 13, color: '#0f172a',
  background: '#f8fafc', resize: 'vertical', outline: 'none',
}

function parseErrorCode(err) {
  if (err.code === 'no_api_key')                          return 'no_key'
  if (err.status === 401 || err.code === 'invalid_api_key') return 'auth'
  if (err.status === 429 || err.code === 'rate_limited')    return 'rate'
  return 'network'
}

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length
}

export default function ContentWriter({ hasApiKey }) {
  const [contentType, setContentType] = useState('blog_post')
  const [tone, setTone]               = useState('professional')
  const [wordCount, setWordCount]     = useState(300)
  const [prompt, setPrompt]           = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const [result, setResult]           = useState('')
  const [editMode, setEditMode]       = useState(false)
  const [error, setError]             = useState(null)
  const [draftUrl, setDraftUrl]       = useState(null)
  const [previewUrl, setPreviewUrl]   = useState(null)
  const [draftError, setDraftError]   = useState(null)
  const [validationError, setValidationError] = useState(false)
  const [lastParams, setLastParams]   = useState(null)
  const [copied, setCopied]           = useState(false)

  async function submit(params) {
    setIsLoading(true); setError(null); setDraftUrl(null); setPreviewUrl(null)
    setDraftError(null); setEditMode(false)
    try {
      const data = await generateContent(params)
      setResult(data.result); setLastParams(params)
    } catch (err) {
      const type = parseErrorCode(err)
      if (type === 'no_key')    setError('No API key configured — add one in Settings first.')
      else if (type === 'auth') setError('Invalid API key. Update it in Settings.')
      else if (type === 'rate') setError('Rate limit hit. Wait a moment and try again.')
      else                      setError('Connection failed. Check your internet.')
    } finally { setIsLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!prompt.trim()) { setValidationError(true); return }
    setValidationError(false)
    await submit({ prompt, contentType, tone, wordCount })
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreateDraft() {
    setDraftError(null)
    const firstLine = result.split('\n').find((l) => l.trim())
    const title = firstLine?.replace(/^#+\s*/, '').trim() || 'AI Generated Draft'
    const htmlContent = marked(result)
    const { siteUrl, adminUrl: wpAdmin, nonce, restUrl } = window.wpAiAssistant
    const wpJsonBase = restUrl.replace('wp-ai-assistant/v1/', '')
    try {
      const res = await fetch(wpJsonBase + 'wp/v2/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
        body: JSON.stringify({ title, content: htmlContent, status: 'draft' }),
      })
      if (!res.ok) throw new Error('Failed to create draft')
      const post = await res.json()
      setDraftUrl(`${wpAdmin}post.php?post=${post.id}&action=edit`)
      setPreviewUrl(`${siteUrl}/?p=${post.id}&preview=true`)
    } catch {
      setDraftError('Failed to create draft post. Try again.')
    }
  }

  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }
  const label = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
  const btnPrimary = { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const btnOutline = { display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 13px', fontSize: 12, fontWeight: 500, background: '#fff', color: '#374151', cursor: 'pointer' }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Content Writer</h1>
        <p style={{ color: '#64748b', fontSize: 13.5, marginTop: 4 }}>Generate copy for your site. Edit before you publish.</p>
      </div>

      {!hasApiKey && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 9 }}>
          <AlertTriangle size={15} color="#d97706" />
          <span style={{ fontSize: 13, color: '#92400e' }}>Add your API key in <strong>Settings</strong> to use this tool.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: result && !isLoading ? '440px 1fr' : '440px', gap: 20, alignItems: 'start' }}>

        {/* Form */}
        <div style={{ ...card, padding: 22 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={label}>Content type</span>
                <div style={{ position: 'relative' }}>
                  <select value={contentType} onChange={(e) => setContentType(e.target.value)}
                    style={{ ...selectStyle, appearance: 'none', paddingRight: 32 }}>
                    {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <span style={label}>Tone</span>
                <div style={{ position: 'relative' }}>
                  <select value={tone} onChange={(e) => setTone(e.target.value)}
                    style={{ ...selectStyle, appearance: 'none', paddingRight: 32 }}>
                    {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={label}>Word count</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>~{wordCount} words</span>
              </div>
              <input
                type="range" min={50} max={1500} step={50} value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="wai-slider"
                style={{
                  width: '100%',
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((wordCount - 50) / 1450) * 100}%, #e2e8f0 ${((wordCount - 50) / 1450) * 100}%, #e2e8f0 100%)`,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                <span>50</span><span>1500</span>
              </div>
            </div>

            <div>
              <span style={label}>What should I write about?</span>
              <textarea
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setValidationError(false) }}
                placeholder="e.g. A beginner's guide to sourdough bread — cover starter, hydration, and baking times"
                rows={5}
                style={{ ...inputStyle, border: `1px solid ${validationError ? '#fca5a5' : '#e2e8f0'}`, lineHeight: 1.6 }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = validationError ? '#fca5a5' : '#e2e8f0'}
              />
              {validationError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>Please enter some text first.</p>}
            </div>

            <button type="submit" disabled={isLoading} style={{ ...btnPrimary, justifyContent: 'center', padding: '9px', opacity: isLoading ? 0.65 : 1 }}>
              {isLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
              {isLoading ? 'Generating…' : 'Generate content'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
              <AlertTriangle size={14} color="#b91c1c" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Result */}
        {result !== '' && !isLoading && (
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Generated content</span>
                <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', borderRadius: 10, padding: '2px 8px' }}>{countWords(result)} words</span>
              </div>
              <button onClick={() => setEditMode((m) => !m)} style={{ ...btnOutline, color: editMode ? '#2563eb' : '#64748b' }}>
                {editMode ? <Eye size={13} /> : <Pencil size={13} />}
                {editMode ? 'Preview' : 'Edit'}
              </button>
            </div>

            <div style={{ padding: '18px 20px' }}>
              {editMode ? (
                <textarea value={result} onChange={(e) => setResult(e.target.value)} rows={16}
                  style={{ ...inputStyle, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7, background: '#f8fafc' }} />
              ) : (
                <div className="wai-prose" style={{ maxHeight: 440, overflowY: 'auto', lineHeight: 1.75 }}
                  dangerouslySetInnerHTML={{ __html: marked(result) }} />
              )}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', padding: '11px 18px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handleCopy} style={copied ? { ...btnOutline, background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' } : btnOutline}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={handleCreateDraft} style={{ ...btnOutline, background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                <FilePlus size={13} /> Create draft
              </button>
              <button onClick={() => lastParams && submit(lastParams)} style={{ ...btnOutline }}>
                <RefreshCw size={13} /> Regenerate
              </button>
            </div>

            {draftUrl && (
              <div style={{ borderTop: '1px solid #d1fae5', padding: '10px 18px', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 16 }}>
                <Check size={14} color="#16a34a" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>Draft created</span>
                <a href={draftUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', border: 'none', outline: 'none', boxShadow: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', padding: 0 }}>
                  <FileEdit size={12} /> Edit in WordPress
                </a>
                <a href={previewUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', border: 'none', outline: 'none', boxShadow: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', padding: 0 }}>
                  <ExternalLink size={12} /> Preview
                </a>
              </div>
            )}
            {draftError && (
              <div style={{ borderTop: '1px solid #fecaca', padding: '10px 18px', background: '#fef2f2', fontSize: 12, color: '#b91c1c' }}>{draftError}</div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
