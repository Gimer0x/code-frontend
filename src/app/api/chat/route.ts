import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limiting: 10 requests per minute per user
const RATE_LIMIT_REQUESTS = 10
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return false
  }
  
  userLimit.count++
  return true
}

// Proxy to backend AI chat

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session as any)?.user?.id || 'anon'

    // Rate limit per user (frontend-side best-effort)
    if (!checkRateLimit(userId)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait before sending another message.' }, { status: 429 })
    }

    const raw = await request.text()
    let parsed: any = null
    try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = null }

    // Normalize to backend expected shape: { messages: [...] }
    let outboundBody: any = null
    if (Array.isArray(parsed?.messages)) {
      // Sanitize roles/content to what backend expects
      const messages = parsed.messages
        .filter((m: any) => m && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'), content: String(m.content) }))
      outboundBody = { messages }
    } else {
      const systemPrompt = 'You are a helpful tutor.'
      const history = Array.isArray(parsed?.chatHistory) ? parsed.chatHistory : []
      const userMsg = (parsed?.message || '').toString()
      const contextBits: string[] = []
      if (parsed?.courseId) contextBits.push(`Course: ${parsed.courseId}`)
      if (parsed?.lessonId) contextBits.push(`Lesson: ${parsed.lessonId}`)
      if (parsed?.currentCode) contextBits.push(`Current Code Provided`)
      const context = contextBits.length ? `\nContext: ${contextBits.join(' | ')}` : ''

      const messages = [
        { role: 'system', content: systemPrompt + context },
        ...history
          .filter((m: any) => m && typeof m.content === 'string' && m.content.trim().length > 0)
          .map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ]
      const combinedUser = userMsg?.trim()?.length ? userMsg : (parsed?.prompt || parsed?.text || '').toString()
      if (combinedUser && combinedUser.trim().length) {
        messages.push({ role: 'user', content: combinedUser })
      }
      // If still no user message, create a minimal prompt using any code/context provided
      if (!messages.some(m => m.role === 'user')) {
        const fallbackParts: string[] = []
        if (parsed?.currentCode) fallbackParts.push('Code snippet provided.')
        if (parsed?.lessonId) fallbackParts.push(`Lesson: ${parsed.lessonId}`)
        const fallback = fallbackParts.length ? `Please assist. ${fallbackParts.join(' ')}` : 'Please assist.'
        messages.push({ role: 'user', content: fallback })
      }
      outboundBody = { messages }
    }

    const backendRes = await fetch('http://localhost:3002/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.backendAccessToken ? { Authorization: `Bearer ${session.backendAccessToken}` } : {}),
      },
      body: JSON.stringify(outboundBody),
    })
    const text = await backendRes.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }

    // Normalize backend variations into a consistent shape
    const reply = data?.reply
      || data?.response
      || data?.message
      || data?.output?.text
      || data?.choices?.[0]?.message?.content
      || ''

    if (backendRes.ok) {
      return NextResponse.json({ success: true, reply, original: data }, { status: 200 })
    }

    // On error, pass through backend payload and status
    return NextResponse.json(data ?? { error: 'Chat backend error' }, { status: backendRes.status })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process your message. Please try again.' }, { status: 500 })
  }
}
