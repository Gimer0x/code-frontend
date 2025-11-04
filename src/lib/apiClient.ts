// lib/apiClient.ts

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

function getTokens() {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null }
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  }
}

function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

async function refreshTokens(): Promise<boolean> {
  const { refreshToken } = getTokens()
  if (!refreshToken) return false

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await res.json()
  if (data.success) {
    setTokens(data.accessToken, data.refreshToken)
    return true
  }
  clearTokens()
  return false
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const { accessToken } = getTokens()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401 && (await refreshTokens())) {
    const { accessToken: newAT } = getTokens()
    if (newAT) headers.Authorization = `Bearer ${newAT}`
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  }
  return res
}

export { API_BASE, apiFetch, setTokens, clearTokens, getTokens }


