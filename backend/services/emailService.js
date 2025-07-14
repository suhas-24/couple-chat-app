const crypto = require('crypto');

class EmailService {
  constructor() {
    // In a production environment, you would use a service like SendGrid, Mailgun, or AWS SES
    // For now, we'll simulate email sending and log the content
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, userName) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const emailContent = {
        to: email,
        subject: 'Password Reset Request - Couple Chat App',
        html: this.generatePasswordResetHTML(userName, resetUrl),
        text: this.generatePasswordResetText(userName, resetUrl)
      };

      if (this.isProduction) {
        // In production, integrate with actual email service
        // await this.sendWithEmailProvider(emailContent);
        console.log('Production email would be sent:', emailContent);
      } else {
        // Development: Log email content
        console.log('\n=== PASSWORD RESET EMAIL ===');
        console.log(`To: ${emailContent.to}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('=============================\n');
      }

      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, message: 'Failed to send password reset email' };
    }
  }

  // Send email verification email
  async sendEmailVerificationEmail(email, verificationToken, userName) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      const emailContent = {
        to: email,
        subject: 'Verify Your Email - Couple Chat App',
        html: this.generateEmailVerificationHTML(userName, verificationUrl),
        text: this.generateEmailVerificationText(userName, verificationUrl)
      };

      if (this.isProduction) {
        // In production, integrate with actual email service
        // await this.sendWithEmailProvider(emailContent);
        console.log('Production email would be sent:', emailContent);
      } else {
        // Development: Log email content
        console.log('\n=== EMAIL VERIFICATION EMAIL ===');
        console.log(`To: ${emailContent.to}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log(`Verification URL: ${verificationUrl}`);
        console.log('=================================\n');
      }

      return { success: true, message: 'Email verification sent successfully' };
    } catch (error) {
      console.error('Error sending email verification:', error);
      return { success: false, message: 'Failed to send email verification' };
    }
  }

  // Send account deletion confirmation email
  async sendAccountDeletionEmail(email, userName) {
    try {
      const emailContent = {
        to: email,
        subject: 'Account Deleted - Couple Chat App',
        html: this.generateAccountDeletionHTML(userName),
        text: this.generateAccountDeletionText(userName)
      };

      if (this.isProduction) {
        // In production, integrate with actual email service
        // await this.sendWithEmailProvider(emailContent);
        console.log('Production email would be sent:', emailContent);
      } else {
        // Development: Log email content
        console.log('\n=== ACCOUNT DELETION EMAIL ===');
        console.log(`To: ${emailContent.to}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log('===============================\n');
      }

      return { success: true, message: 'Account deletion confirmation sent' };
    } catch (error) {
      console.error('Error sending account deletion email:', error);
      return { success: false, message: 'Failed to send account deletion confirmation' };
    }
  }

  // Generate password reset HTML template
  generatePasswordResetHTML(userName, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💕 Couple Chat App</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${userName},</p>
            <p>We received a request to reset your password for your Couple Chat App account. If you made this request, click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 10 minutes for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security, this link can only be used once.</p>
          </div>
          <div class="footer">
            <p>💕 Keep your love conversations secure with Couple Chat App</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate password reset text template
  generatePasswordResetText(userName, resetUrl) {
    return `
      Password Reset Request - Couple Chat App
      
      Hi ${userName},
      
      We received a request to reset your password for your Couple Chat App account.
      
      If you made this request, click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 10 minutes for security reasons.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      
      For security, this link can only be used once.
      
      💕 Keep your love conversations secure with Couple Chat App
    `;
  }

  // Generate email verification HTML template
  generateEmailVerificationHTML(userName, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💕 Welcome to Couple Chat App</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hi ${userName},</p>
            <p>Welcome to Couple Chat App! To complete your registration and start sharing beautiful moments with your partner, please verify your email address:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>💕 Start your romantic journey with Couple Chat App</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate email verification text template
  generateEmailVerificationText(userName, verificationUrl) {
    return `
      Welcome to Couple Chat App!
      
      Hi ${userName},
      
      Welcome to Couple Chat App! To complete your registration and start sharing beautiful moments with your partner, please verify your email address:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
      
      💕 Start your romantic journey with Couple Chat App
    `;
  }

  // Generate account deletion HTML template
  generateAccountDeletionHTML(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Deleted</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #666; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Couple Chat App</h1>
          </div>
          <div class="content">
            <h2>Account Successfully Deleted</h2>
            <p>Hi ${userName},</p>
            <p>Your Couple Chat App account has been successfully deleted as requested.</p>
            <p>All your personal data, messages, and associated information have been permanently removed from our systems.</p>
            <p>We're sorry to see you go. If you ever decide to return, you're always welcome to create a new account.</p>
            <p>Thank you for being part of our community.</p>
          </div>
          <div class="footer">
            <p>Take care and best wishes for your future!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate account deletion text template
  generateAccountDeletionText(userName) {
    return `
      Account Successfully Deleted - Couple Chat App
      
      Hi ${userName},
      
      Your Couple Chat App account has been successfully deleted as requested.
      
      All your personal data, messages, and associated information have been permanently removed from our systems.
      
      We're sorry to see you go. If you ever decide to return, you're always welcome to create a new account.
      
      Thank you for being part of our community.
      
      Take care and best wishes for your future!
    `;
  }

  // Method to integrate with actual email service provider (placeholder)
  async sendWithEmailProvider(emailContent) {
    // This would integrate with services like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Nodemailer with SMTP
    
    throw new Error('Email provider integration not implemented');
  }
}

module.exports = new EmailService();