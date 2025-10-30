// lib/authClient.ts
import { apiFetch } from './apiClient'

export async function registerUser(input: { email: string; password: string; name?: string }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  return data
}

export async function loginUser(input: { email: string; password: string }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  return data
}

export async function googleLoginWithIdToken(idToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'}/api/user-auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const data = await res.json()
  return data
}

export async function getProfile() {
  const res = await apiFetch('/api/auth/profile')
  return res.json()
}


