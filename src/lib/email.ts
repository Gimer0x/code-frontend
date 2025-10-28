import nodemailer from 'nodemailer'

interface EmailConfig {
  host: string
  port: number
  user: string
  pass: string
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })
  }

  async sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@dappdojo.com',
        to,
        subject,
        html,
      })
      return true
    } catch (error) {
      console.error('Email sending failed:', error)
      return false
    }
  }

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

// Create a mock email service for development
export const createMockEmailService = (): EmailService => {
  return new EmailService({
    host: 'localhost',
    port: 1025,
    user: 'mock@dappdojo.com',
    pass: 'mock-password',
  })
}

// Create a development email service that simulates email sending
export class DevEmailService extends EmailService {
  constructor() {
    super({
      host: 'localhost',
      port: 1025,
      user: 'dev@dappdojo.com',
      pass: 'dev-password',
    })
  }

  async sendEmail(): Promise<boolean> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    return true
  }

  async sendPasswordResetEmail(): Promise<boolean> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    return true
  }
}

export const createDevEmailService = (): EmailService => {
  return new DevEmailService()
}
