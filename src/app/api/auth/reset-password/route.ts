import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import { passwordResetSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input schema
    const validationResult = passwordResetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }

    const { token, newPassword } = validationResult.data

    // Find valid reset token
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update user password
    await prisma.user.update({
      where: { email: resetRecord.email },
      data: { password: hashedPassword }
    })

    // Delete used reset token
    await prisma.passwordReset.delete({
      where: { id: resetRecord.id }
    })

    return NextResponse.json({ message: 'Password reset successfully' })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
