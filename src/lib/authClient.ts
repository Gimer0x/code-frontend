// lib/authClient.ts
import { apiFetch } from './apiClient'

export async function registerUser(input: { email: string; password: string; name?: string }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  return data
}

export async function loginUser(input: { email: string; password: string }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  return data
}

export async function googleLoginWithIdToken(idToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/user-auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const data = await res.json()
  return data
}

export async function getProfile() {
  const res = await apiFetch('/api/auth/profile')
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  if (!res.ok) return { success: false, ...(typeof data === 'object' ? data : { error: text || 'Request failed' }) }
  return data
}


