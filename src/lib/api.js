const { restUrl, nonce } = window.wpAiAssistant

const headers = {
  'Content-Type': 'application/json',
  'X-WP-Nonce': nonce,
}

export async function explainBug(errorText) {
  const res = await fetch(restUrl + 'bug', {
    method: 'POST',
    headers,
    body: JSON.stringify({ error_text: errorText }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const code = data?.code ?? ''
    throw Object.assign(new Error(data?.message ?? 'Request failed'), { code, status: res.status })
  }
  return res.json()
}

export async function generateContent({ prompt, contentType, tone, wordCount }) {
  const res = await fetch(restUrl + 'content', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, content_type: contentType, tone, word_count: wordCount }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const code = data?.code ?? ''
    throw Object.assign(new Error(data?.message ?? 'Request failed'), { code, status: res.status })
  }
  return res.json()
}

export async function loadDebugLog() {
  const res = await fetch(restUrl + 'debug-log', { headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function enableDebugLog() {
  const res = await fetch(restUrl + 'enable-debug-log', { method: 'POST', headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.message ?? 'Could not enable debug log.')
  }
  return res.json()
}

export async function saveSettings(data) {
  const res = await fetch(restUrl + 'settings', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getSettings() {
  const res = await fetch(restUrl + 'settings', { headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function testConnection() {
  const res = await fetch(restUrl + 'test', { method: 'POST', headers })
  const text = await res.text()
  if (!res.ok || text.trim().startsWith('<')) {
    // WordPress returned an HTML error page — PHP crashed
    const data = (() => { try { return JSON.parse(text) } catch { return {} } })()
    const msg = data?.message
      ?? (text.includes('critical error') ? 'WordPress hit a critical PHP error. Open the Bug Explainer → Load from debug.log to see what crashed.' : 'Connection failed.')
    throw Object.assign(new Error(msg), { code: data?.code, status: res.status })
  }
  return JSON.parse(text)
}
