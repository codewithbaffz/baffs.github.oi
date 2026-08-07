// backend/src/services/emailService.js
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configure email transporter
const createTransporter = () => {
  // Remove spaces from password if present
  const password = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : '';
  
  console.log('📧 Creating email transporter...');
  console.log('📧 SMTP_USER:', process.env.SMTP_USER);
  console.log('📧 SMTP_PASS set?', password ? '✅ Yes' : '❌ No');
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: password, // Use cleaned password
    },
    tls: {
      rejectUnauthorized: false, // For development
    },
  });
};

// Generate invitation token
export const generateInviteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send invitation email
export const sendInvitationEmail = async (inviteData) => {
  const {
    email,
    workspaceName,
    inviterName,
    inviteCode,
    inviteToken,
    frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173',
  } = inviteData;

  const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}&workspace=${encodeURIComponent(workspaceName)}`;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"${process.env.COMPANY_NAME || 'Schedulfy'}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `You're invited to join ${workspaceName} on Schedulfy!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6C63FF, #00D4FF); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #5a52d5; }
            .invite-code { background: #e9ecef; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 18px; text-align: center; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 You're Invited!</h1>
          </div>
          <div class="content">
            <h2>${inviterName} has invited you to join ${workspaceName}</h2>
            
            <p>You've been invited to collaborate on <strong>${workspaceName}</strong>.</p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
            
            <p>Or use this invite code:</p>
            <div class="invite-code">${inviteCode}</div>
            
            <p>This invitation will expire in 7 days.</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;" />
            
            <p style="font-size: 14px; color: #6c757d;">
              If you don't have a Schedulfy account yet, you'll be prompted to create one.
            </p>
          </div>
          <div class="footer">
            <p>This invitation was sent from Schedulfy. If you didn't expect this, you can ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    // Verify connection before sending
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Invitation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send invitation email:', error);
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }
};