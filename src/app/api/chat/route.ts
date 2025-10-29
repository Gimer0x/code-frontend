import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait before sending another message.' 
      }, { status: 429 })
    }

    const { message, courseId, lessonId, currentCode, chatHistory } = await request.json()

    if (!message || !courseId || !lessonId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get lesson details for context
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        contentMarkdown: true,
        initialCode: true,
        tests: true,
        module: {
          select: {
            title: true,
            course: {
              select: {
                title: true
              }
            }
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Build context for the AI
    const context = `
You are an expert Solidity and blockchain tutor. You're helping a student with a coding challenge.

LESSON CONTEXT:
- Course: ${lesson.module.course.title}
- Module: ${lesson.module.title}
- Lesson: ${lesson.title}
- Instructions: ${lesson.contentMarkdown}

CURRENT STUDENT CODE:
\`\`\`solidity
${currentCode || 'No code written yet'}
\`\`\`

TEST REQUIREMENTS:
${lesson.tests || 'No specific test requirements provided'}

INITIAL TEMPLATE:
\`\`\`solidity
${lesson.initialCode || 'No initial code provided'}
\`\`\`
`

    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert Solidity and blockchain tutor. You help students learn smart contract development, Solidity programming, and blockchain concepts. 

You should:
- Provide clear, educational explanations
- Help debug code issues
- Explain Solidity concepts and best practices
- Guide students toward solutions without giving away answers
- Use markdown formatting for code blocks and explanations
- Be encouraging and supportive

${context}`
      },
      ...chatHistory.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json({ 
          error: 'OpenAI rate limit exceeded. Please try again later.' 
        }, { status: 429 })
      }
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json({ 
          error: 'OpenAI quota exceeded. Please contact support.' 
        }, { status: 402 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to process your message. Please try again.' 
    }, { status: 500 })
  }
}
