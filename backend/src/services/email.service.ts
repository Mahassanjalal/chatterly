import nodemailer from 'nodemailer'
import { logger } from '../config/logger'

// Email configuration - uses environment variables
// In production, use a real email service like SendGrid, SES, etc.
const createTransporter = () => {
  // For development, use a test account or ethereal email
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    })
  }

  // Production configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const transporter = createTransporter()

const getBaseUrl = (): string => {
  return process.env.FRONTEND_URL || 'http://localhost:3000'
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Properly strip HTML tags by first removing script/style tags, then all other tags
    const stripHtml = (html: string): string => {
      // Remove script and style tags with their content using a non-regex approach
      let text = html;
      
      // Remove script tags
      while (text.includes('<script')) {
        const start = text.indexOf('<script');
        const end = text.indexOf('</script>');
        if (start !== -1 && end !== -1) {
          text = text.substring(0, start) + text.substring(end + 9);
        } else {
          break;
        }
      }
      
      // Remove style tags
      while (text.includes('<style')) {
        const start = text.indexOf('<style');
        const end = text.indexOf('</style>');
        if (start !== -1 && end !== -1) {
          text = text.substring(0, start) + text.substring(end + 8);
        } else {
          break;
        }
      }
      
      // Remove all remaining HTML tags using indexOf to avoid regex vulnerabilities
      while (text.includes('<') && text.includes('>')) {
        const start = text.indexOf('<');
        const end = text.indexOf('>', start);
        if (start !== -1 && end !== -1) {
          text = text.substring(0, start) + ' ' + text.substring(end + 1);
        } else {
          break;
        }
      }
      
      // Clean up extra whitespace
      return text.split(/\s+/).filter(Boolean).join(' ').trim();
    };

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Chatterly" <noreply@chatterly.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    }

    const info = await transporter.sendMail(mailOptions)
    logger.info(`Email sent: ${info.messageId}`)
    
    // If using ethereal, log the preview URL
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`)
    }
    
    return true
  } catch (error) {
    logger.error('Error sending email:', error)
    return false
  }
}

export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  const verificationUrl = `${getBaseUrl()}/verify-email?token=${token}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Chatterly!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for registering with Chatterly! Please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account with Chatterly, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Chatterly. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Verify your Chatterly account',
    html,
  })
}

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Chatterly. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Reset your Chatterly password',
    html,
  })
}

export const sendAccountDeletionConfirmation = async (
  email: string,
  name: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #374151; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Deleted</h1>
        </div>
        <div class="content">
          <h2>Goodbye ${name},</h2>
          <p>Your Chatterly account has been successfully deleted. All your personal data has been permanently removed from our systems.</p>
          <p>We're sorry to see you go. If you ever want to come back, you're always welcome to create a new account.</p>
          <p>Thank you for being part of the Chatterly community.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Chatterly. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Your Chatterly account has been deleted',
    html,
  })
}

export const emailService = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountDeletionConfirmation,
}
