// hooks/useAIChat.ts
'use client'

import { useCallback, useRef, useState } from 'react'
import { API_BASE } from '@/lib/apiClient'

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

export function useAIChat() {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'system', content: 'You are a helpful tutor.' }])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (userText: string) => {
    setLoading(true)
    const next = [...messages, { role: 'user', content: userText }]
    setMessages(next)
    try {
      // Use frontend proxy to normalize payload and forward auth
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (data && (data.success === undefined || data.success === true)) {
        const assistantText = data.reply || data.response || data.message || ''
        setReply(assistantText)
        setMessages([...next, { role: 'assistant', content: assistantText }])
      }
      return data
    } finally {
      setLoading(false)
    }
  }, [messages])

  const stream = useCallback(async (userText: string, onToken?: (t: string) => void) => {
    setLoading(true)
    const next = [...messages, { role: 'user', content: userText }]
    setMessages(next)
    setReply('')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      // If you add a frontend stream proxy, switch this to `/api/chat/stream`
      const res = await fetch(`${API_BASE}/api/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('accessToken') ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } : {}) },
        body: JSON.stringify({ messages: next }),
        signal: ctrl.signal,
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(Boolean)
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const payload = line.replace(/^data:\s*/, '')
          if (payload === '[DONE]') break
          try {
            const obj = JSON.parse(payload)
            if (obj.token) {
              acc += obj.token
              setReply(acc)
              onToken?.(obj.token)
            }
          } catch {}
        }
      }
      setMessages([...next, { role: 'assistant', content: acc }])
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [messages])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, reply, loading, send, stream, cancel }
}


