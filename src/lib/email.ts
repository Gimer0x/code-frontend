/**
 * Simple email service for password reset
 * In development, returns the reset token in the response
 * In production, you should integrate with a real email service (SendGrid, AWS SES, etc.)
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export class EmailService {
  /**
   * Simulate sending an email
   * In production, integrate with your email provider here
   */
  async sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Log email details in development (for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Email Service] Simulated email send:', {
        to,
        subject,
        htmlLength: html.length
      })
    }
    
    // Always return true (simulation)
    // In production, replace this with actual email sending logic
    return true
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
    const subject = 'Password Reset Request - DappDojo'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F2B91D;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password for your DappDojo account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}?token=${resetToken}" 
           style="display: inline-block; background-color: #F2B91D; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Reset Password
        </a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${resetUrl}?token=${resetToken}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>The DappDojo Team</p>
      </div>
    `

    return this.sendEmail({ to: email, subject, html })
  }
}

/**
 * Create email service instance
 * In production, you can configure this to use a real email provider
 */
export const createEmailService = (): EmailService => {
  return new EmailService()
}

// For backward compatibility
export const createDevEmailService = (): EmailService => {
  return createEmailService()
}
