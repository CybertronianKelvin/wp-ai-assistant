import React, { useState, useEffect, useRef } from 'react'
import { Bot, Brain, Sparkles, Shuffle, Save, Zap, Check, X, ExternalLink, Info, Key, Cpu, Search } from 'lucide-react'
import { getSettings, saveSettings, testConnection } from '../lib/api'

function ModelSearch({ models, value, onChange }) {
  const [inputVal, setInputVal] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Keep local input in sync if parent changes value
  useEffect(() => { setInputVal(value) }, [value])

  const filtered = inputVal
    ? models.filter(m => m.toLowerCase().includes(inputVal.toLowerCase()))
    : models

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        // Commit whatever is typed as the model
        if (inputVal.trim()) onChange(inputVal.trim())
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inputVal, onChange])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Type or search a model…"
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 14px 9px 32px', fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none' }}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter') { onChange(inputVal.trim()); setOpen(false) } }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto', marginTop: 4 }}>
          {filtered.map(m => (
            <div key={m} onMouseDown={(e) => { e.preventDefault(); setInputVal(m); onChange(m); setOpen(false) }}
              style={{ padding: '8px 14px', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer', color: m === value ? '#1d4ed8' : '#334155', background: m === value ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}
              onMouseEnter={(e) => { if (m !== value) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={(e) => { if (m !== value) e.currentTarget.style.background = m === value ? '#eff6ff' : 'transparent' }}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PROVIDERS = [
  { value: 'openai',    label: 'OpenAI',         Icon: Bot,      desc: 'GPT-4o family' },
  { value: 'anthropic', label: 'Anthropic',       Icon: Brain,    desc: 'Claude family' },
  { value: 'gemini',    label: 'Google Gemini',   Icon: Sparkles, desc: 'Gemini 2.0 & 1.5' },
  { value: 'openrouter',label: 'OpenRouter',      Icon: Shuffle,  desc: '100+ models, many free' },
]

const MODEL_SUGGESTIONS = {
  openai:      ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  anthropic:   ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-6'],
  gemini:      ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openrouter:  [
    // General purpose — good for writing & bug explanation
    'deepseek/deepseek-v4-flash:free',           // 1M ctx, very capable
    'openai/gpt-oss-120b:free',                  // OpenAI open weights, 131k ctx
    'openai/gpt-oss-20b:free',                   // Lighter, fast
    'qwen/qwen3-next-80b-a3b-instruct:free',     // Strong general model
    'google/gemma-4-31b-it:free',                // Google, 262k ctx
    'google/gemma-4-26b-a4b-it:free',            // Google MoE, efficient
    'nvidia/nemotron-3-super-120b-a12b:free',    // NVIDIA, 262k ctx
    'nousresearch/hermes-3-llama-3.1-405b:free', // Great for reasoning
    'meta-llama/llama-3.3-70b-instruct:free',    // Popular, may rate-limit quickly
    'meta-llama/llama-3.2-3b-instruct:free',     // Tiny & fast fallback
    'minimax/minimax-m2.5:free',
    'qwen/qwen3-coder:free',                     // Best for code/bug tasks
    'arcee-ai/trinity-large-thinking:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'z-ai/glm-4.5-air:free',
  ],
}

const KEY_PLACEHOLDERS = {
  openai:      'sk-...',
  anthropic:   'sk-ant-...',
  gemini:      'AIza...',
  openrouter:  'sk-or-...',
}

export default function SettingsPanel({ onKeySaved }) {
  const [provider, setProvider]   = useState('openai')
  const [apiKey, setApiKey]       = useState('')
  const [model, setModel]         = useState('gpt-4o-mini')
  const [isSaving, setIsSaving]   = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [saveMsg, setSaveMsg]     = useState(null)
  const [testMsg, setTestMsg]     = useState(null)
  const [maskedKey, setMaskedKey] = useState('')

  useEffect(() => {
    getSettings()
      .then((s) => {
        setProvider(s.provider ?? 'openai')
        setMaskedKey(s.api_key ?? '')
        setModel(s.model ?? 'gpt-4o-mini')
      })
      .catch(() => {})
  }, [])

  async function handleSave(e) {
    e.preventDefault(); setIsSaving(true); setSaveMsg(null)
    try {
      await saveSettings({ provider, api_key: apiKey || maskedKey, model, custom_url: '' })
      setSaveMsg({ ok: true, text: 'Settings saved.' })
      if (apiKey) { setMaskedKey('****' + apiKey.slice(-4)); setApiKey(''); onKeySaved?.() }
    } catch { setSaveMsg({ ok: false, text: 'Failed to save.' }) }
    finally { setIsSaving(false) }
  }

  async function handleTest() {
    setIsTesting(true); setTestMsg(null)
    try {
      await saveSettings({ provider, api_key: apiKey || maskedKey, model, custom_url: '' })
      await testConnection()
      setTestMsg({ ok: true, text: 'Connection successful!' })
    } catch (err) {
      setTestMsg({ ok: false, text: err.message || 'Connection failed.' })
    } finally { setIsTesting(false) }
  }

  const suggestions = MODEL_SUGGESTIONS[provider] ?? []
  const currentProvider = PROVIDERS.find((p) => p.value === provider)

  const card      = { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
  const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none' }
  const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
  const btnOutline = { display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 500, background: '#fff', color: '#374151', cursor: 'pointer' }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ color: '#64748b', fontSize: 13.5, marginTop: 4 }}>Configure your AI provider and API key.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Main settings */}
        <div style={{ ...card, overflow: 'hidden' }}>

          {/* Provider selector */}
          <div style={{ padding: '20px 22px', borderBottom: '1px solid #e2e8f0' }}>
            <span style={labelStyle}>Provider</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PROVIDERS.map(({ value, label, Icon, desc }) => {
                const active = provider === value
                return (
                  <button key={value} type="button"
                    onClick={() => { setProvider(value); setModel(MODEL_SUGGESTIONS[value]?.[0] ?? '') }}
                    style={{
                      border: `2px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: 10, padding: '12px 8px',
                      background: active ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={20} color={active ? '#2563eb' : '#94a3b8'} style={{ margin: '0 auto 6px' }} strokeWidth={1.75} />
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? '#1d4ed8' : '#374151' }}>{label}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{desc}</div>
                  </button>
                )
              })}
            </div>

            {provider === 'openrouter' && (
              <div style={{ marginTop: 12, background: '#eff6ff', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Info size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span style={{ fontSize: 12.5, color: '#1d4ed8', lineHeight: 1.5 }}>
                    Use any model from 100+ providers — many are free.{' '}
                    <a href="https://openrouter.ai/" target="_blank" rel="noreferrer"
                      style={{ fontWeight: 600, color: '#1d4ed8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      Sign up at openrouter.ai <ExternalLink size={11} />
                    </a>{' '}
                    to get your API key.
                  </span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* API Key */}
              <div>
                <span style={labelStyle}><Key size={11} style={{ display: 'inline', marginRight: 4 }} />API Key</span>
                <input type="password" value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={maskedKey || KEY_PLACEHOLDERS[provider] || 'your-api-key'}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                {maskedKey && (
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Current: {maskedKey} — leave blank to keep it
                  </p>
                )}
              </div>

              {/* Model */}
              <div>
                <span style={labelStyle}><Cpu size={11} style={{ display: 'inline', marginRight: 4 }} />Model</span>

                {provider === 'openrouter' ? (
                  /* Searchable dropdown for OpenRouter's large model list */
                  <ModelSearch
                    models={suggestions.filter(s => !s.startsWith('//'))}
                    value={model}
                    onChange={setModel}
                  />
                ) : (
                  <>
                    <input list="model-suggestions" value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. gpt-4o-mini"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <datalist id="model-suggestions">
                      {suggestions.map((s) => <option key={s} value={s} />)}
                    </datalist>
                    {suggestions.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                        {suggestions.map((s) => (
                          <button key={s} type="button" onClick={() => setModel(s)} style={{
                            fontSize: 11, padding: '3px 9px', borderRadius: 12, cursor: 'pointer',
                            border: `1px solid ${model === s ? '#2563eb' : '#e2e8f0'}`,
                            background: model === s ? '#eff6ff' : '#f8fafc',
                            color: model === s ? '#1d4ed8' : '#64748b',
                            fontWeight: model === s ? 600 : 400,
                          }}>{s}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {provider === 'openrouter' && (
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                    If you hit rate limits, try <code style={{ fontSize: 10 }}>deepseek/deepseek-v4-flash:free</code> or <code style={{ fontSize: 10 }}>openai/gpt-oss-120b:free</code> — they're less congested.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 22px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="submit" disabled={isSaving} style={{ ...btnPrimary, opacity: isSaving ? 0.7 : 1 }}>
                <Save size={13} /> {isSaving ? 'Saving…' : 'Save settings'}
              </button>
              <button type="button" onClick={handleTest} disabled={isTesting} style={{ ...btnOutline, opacity: isTesting ? 0.7 : 1 }}>
                <Zap size={13} /> {isTesting ? 'Testing…' : 'Test connection'}
              </button>
              <div style={{ flex: 1 }} />
              {saveMsg && (
                <span style={{ fontSize: 12.5, fontWeight: 500, color: saveMsg.ok ? '#16a34a' : '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {saveMsg.ok ? <Check size={13} /> : <X size={13} />} {saveMsg.text}
                </span>
              )}
            </div>
          </form>

          {testMsg && (
            <div style={{
              margin: '0 22px 20px',
              background: testMsg.ok ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${testMsg.ok ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: testMsg.ok ? '#15803d' : '#b91c1c',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {testMsg.ok ? <Check size={14} /> : <X size={14} />} {testMsg.text}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Active config */}
          <div style={{ ...card, padding: 18 }}>
            <span style={labelStyle}>Active configuration</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {currentProvider && <currentProvider.Icon size={22} color="#2563eb" strokeWidth={1.75} />}
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{currentProvider?.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{model || '—'}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
              <p style={{ margin: '0 0 3px', fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API key</p>
              <p style={{ margin: 0, fontSize: 12.5, fontFamily: 'monospace', color: maskedKey ? '#0f172a' : '#cbd5e1' }}>
                {maskedKey || 'Not configured'}
              </p>
            </div>
          </div>

          {/* OpenRouter tip */}
          <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderRadius: 12, border: '1px solid #ddd6fe', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Shuffle size={14} color="#7c3aed" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4c1d95' }}>Start free with OpenRouter</span>
            </div>
            <p style={{ fontSize: 12, color: '#5b21b6', margin: '0 0 10px', lineHeight: 1.6 }}>
              Create a free account and use models like{' '}
              <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.7)', padding: '1px 5px', borderRadius: 3 }}>
                meta-llama/llama-3.3-70b-instruct:free
              </code>{' '}
              at zero cost.
            </p>
            <a href="https://openrouter.ai/" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#7c3aed', textDecoration: 'none' }}>
              Sign up at openrouter.ai <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
