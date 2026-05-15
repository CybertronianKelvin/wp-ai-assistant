import React, { useState, useEffect } from 'react'
import { Bug, PenLine, Settings, Wifi, WifiOff } from 'lucide-react'
import BugExplainer from './components/BugExplainer'
import ContentWriter from './components/ContentWriter'
import SettingsPanel from './components/SettingsPanel'
import { getSettings } from './lib/api'

const TABS = [
  { id: 'bug',      label: 'Bug Explainer',  Icon: Bug },
  { id: 'content',  label: 'Content Writer', Icon: PenLine },
  { id: 'settings', label: 'Settings',       Icon: Settings },
]

// WP admin sidebar is 160px expanded, 36px collapsed
// WP admin bar is 32px tall
// We read the actual left offset from #wpcontent at runtime
function getWpContentLeft() {
  const el = document.getElementById('wpcontent')
  if (el) return el.getBoundingClientRect().left
  return 160
}

export default function App() {
  const [activeTab, setActiveTab] = useState('bug')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [leftOffset, setLeftOffset] = useState(0)

  useEffect(() => {
    getSettings()
      .then((s) => setHasApiKey(Boolean(s.api_key)))
      .catch(() => {})

    // Measure the exact left edge of WP's content area so our fixed
    // header starts flush with it — no gap, works with any sidebar state
    const measure = () => setLeftOffset(getWpContentLeft())
    measure()
    window.addEventListener('resize', measure)
    // Also re-measure when WP collapses/expands the sidebar
    document.getElementById('collapse-button')?.addEventListener('click', () => setTimeout(measure, 300))
    return () => window.removeEventListener('resize', measure)
  }, [])

  const HEADER_H = 50

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f1f5f9' }}>

      {/* Fixed header — anchored to the real left edge of #wpcontent */}
      <div style={{
        position: 'fixed',
        top: 32,          // below the WP admin bar
        left: leftOffset,
        right: 0,
        height: HEADER_H,
        zIndex: 9990,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 650, fontSize: 14, letterSpacing: '-0.01em' }}>
            WP AI Assistant
          </span>
          <nav style={{ display: 'flex', gap: 1 }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id
              return (
                <button key={id} onClick={() => setActiveTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none', borderRadius: 6, padding: '5px 12px',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? '#f8fafc' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', outline: 'none', transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                >
                  <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                  {label}
                </button>
              )
            })}
          </nav>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: hasApiKey ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${hasApiKey ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
          borderRadius: 20, padding: '4px 11px',
        }}>
          {hasApiKey
            ? <Wifi size={12} color="#4ade80" strokeWidth={2} />
            : <WifiOff size={12} color="#f87171" strokeWidth={2} />}
          <span style={{ fontSize: 12, color: hasApiKey ? '#86efac' : '#fca5a5', fontWeight: 500 }}>
            {hasApiKey ? 'Connected' : 'No API key'}
          </span>
        </div>
      </div>

      {/* Push content below the fixed header */}
      <div style={{ paddingTop: HEADER_H, minHeight: '80vh' }}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: activeTab === 'bug'      ? 'block' : 'none' }}><BugExplainer hasApiKey={hasApiKey} /></div>
          <div style={{ display: activeTab === 'content'  ? 'block' : 'none' }}><ContentWriter hasApiKey={hasApiKey} /></div>
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}><SettingsPanel onKeySaved={() => setHasApiKey(true)} /></div>
        </div>
      </div>
    </div>
  )
}
