import { z } from 'zod'

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email too long')
  .transform(email => email.toLowerCase().trim())

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')

// Login input validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Password change validation
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
})

// Password reset validation
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema
})

// Forgot password validation
export const forgotPasswordSchema = z.object({
  email: emailSchema
})

// Sanitize and validate input data
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

// Validate and sanitize email
export function validateEmail(email: string): string | null {
  try {
    const validated = emailSchema.parse(email)
    return sanitizeInput(validated)
  } catch {
    return null
  }
}

// Validate and sanitize password
export function validatePassword(password: string): string | null {
  try {
    const validated = passwordSchema.parse(password)
    return validated
  } catch {
    return null
  }
}

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  private maxAttempts: number
  private windowMs: number

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const attempt = this.attempts.get(identifier)

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (attempt.count >= this.maxAttempts) {
      return false
    }

    attempt.count++
    return true
  }

  getRemainingAttempts(identifier: string): number {
    const attempt = this.attempts.get(identifier)
    if (!attempt) return this.maxAttempts
    return Math.max(0, this.maxAttempts - attempt.count)
  }
}

// XSS protection
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// CSRF token validation
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  return token === expectedToken && token.length > 0
}

