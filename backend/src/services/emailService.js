// backend/src/services/emailService.js
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configure email transporter
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : '';

  if (!user || !password) {
    throw new Error('SMTP_USER and SMTP_PASS must be configured to send email');
  }
  
  console.log(' Creating email transporter...');
  console.log(' SMTP_USER:', user);
  console.log(' SMTP_PASS set?', password ? ' Yes' : ' No');
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: {
      user,
      pass: password,
    },
  });
};

// Generate invitation token
export const generateInviteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const sendPasswordResetEmail = async ({ email, resetToken, frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173' }) => {
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"${process.env.COMPANY_NAME || 'Schedulfy'}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your Schedulfy password',
    text: `Reset your Schedulfy password here: ${resetLink}\n\nThis link expires in 30 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937"><h2>Reset your password</h2><p>We received a request to reset your Schedulfy password.</p><p><a href="${resetLink}" style="display:inline-block;background:#1877f2;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p></div>`,
  });
};

// Send invitation email — MODERN VERSION
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

  // ---  MODERN EMAIL HTML ---
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to ${workspaceName}</title>
        <style>
          /* Reset & Base */
          body {
            margin: 0;
            padding: 0;
            background-color: #f4f6fa;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #1a1a2e;
            line-height: 1.6;
          }

          /* Main Container */
          .container {
            max-width: 580px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), 0 8px 20px rgba(0, 0, 0, 0.02);
            overflow: hidden;
          }

          /* Header */
          .header {
            background: #ffffff;
            padding: 40px 40px 20px 40px;
            text-align: center;
            border-bottom: 1px solid #f0f2f5;
          }

          .header-icon {
            font-size: 48px;
            margin-bottom: 8px;
            display: block;
          }

          .header h1 {
            font-size: 26px;
            font-weight: 700;
            margin: 0;
            color: #1a1a2e;
            letter-spacing: -0.5px;
          }

          .header .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin: 6px 0 0 0;
            font-weight: 400;
          }

          /* Content */
          .content {
            padding: 32px 40px 40px 40px;
          }

          .greeting {
            font-size: 18px;
            font-weight: 500;
            margin: 0 0 6px 0;
            color: #1a1a2e;
          }

          .message {
            font-size: 15px;
            color: #4b5563;
            margin: 0 0 24px 0;
          }

          .message strong {
            color: #1a1a2e;
          }

          /* Workspace Chip */
          .workspace-chip {
            display: inline-block;
            background: #f0f4ff;
            color: #4f46e5;
            font-weight: 600;
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 14px;
            margin: 0 0 24px 0;
          }

          /* Divider */
          .divider {
            border: none;
            border-top: 2px dashed #e5e7eb;
            margin: 28px 0;
          }

          /* Button */
          .btn-container {
            text-align: center;
            margin: 28px 0 20px 0;
          }

          .btn {
            display: inline-block;
            background: #4f46e5;
            color: #ffffff !important;
            font-weight: 600;
            font-size: 16px;
            padding: 14px 40px;
            border-radius: 40px;
            text-decoration: none;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
            transition: all 0.2s ease;
            letter-spacing: 0.3px;
          }

          .btn:hover {
            background: #4338ca;
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45);
            transform: translateY(-2px);
          }

          /* Invite Code */
          .code-section {
            background: #f8fafc;
            border-radius: 16px;
            padding: 16px 20px;
            margin: 20px 0 8px 0;
            text-align: center;
            border: 1px solid #eef2f6;
          }

          .code-label {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0 0 4px 0;
          }

          .code-value {
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 22px;
            font-weight: 700;
            color: #1a1a2e;
            letter-spacing: 2px;
            background: #ffffff;
            padding: 6px 20px;
            border-radius: 8px;
            display: inline-block;
            border: 1px solid #e5e7eb;
          }

          /* Expiry */
          .expiry-note {
            font-size: 13px;
            color: #9ca3af;
            text-align: center;
            margin: 16px 0 0 0;
          }

          /* Footer */
          .footer {
            background: #fafbfc;
            padding: 24px 40px;
            border-top: 1px solid #f0f2f5;
            text-align: center;
          }

          .footer p {
            font-size: 13px;
            color: #9ca3af;
            margin: 0 0 4px 0;
          }

          .footer .brand {
            font-weight: 600;
            color: #4f46e5;
          }

          /* Mobile Responsive */
          @media (max-width: 600px) {
            .container {
              margin: 16px;
              border-radius: 20px;
            }
            .header {
              padding: 28px 20px 16px 20px;
            }
            .header h1 {
              font-size: 22px;
            }
            .content {
              padding: 24px 20px 28px 20px;
            }
            .btn {
              padding: 12px 32px;
              font-size: 15px;
              width: 100%;
              box-sizing: border-box;
            }
            .code-value {
              font-size: 18px;
              padding: 4px 16px;
              letter-spacing: 1px;
            }
            .footer {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa; padding:20px 0;">
          <tr>
            <td align="center">
              <div class="container">

                <!-- HEADER -->
                <div class="header">
                  <span class="header-icon"></span>
                  <h1>You're Invited!</h1>
                  <p class="subtitle">Join your team on Schedulfy</p>
                </div>

                <!-- CONTENT -->
                <div class="content">

                  <p class="greeting">Hi there,</p>

                  <p class="message">
                    <strong>${inviterName}</strong> has invited you to join the workspace
                    <strong>${workspaceName}</strong> on Schedulfy. Collaborate, schedule, and stay organized — all in one place.
                  </p>

                  <div style="text-align:center;">
                    <span class="workspace-chip"> ${workspaceName}</span>
                  </div>

                  <hr class="divider" />

                  <div class="btn-container">
                    <a href="${inviteLink}" class="btn">Accept Invitation →</a>
                  </div>

                  <p style="text-align:center; font-size:14px; color:#6b7280; margin:0 0 4px 0;">
                    Or use this invite code:
                  </p>

                  <div class="code-section">
                    <p class="code-label">Your Invite Code</p>
                    <span class="code-value">${inviteCode}</span>
                  </div>

                  <p class="expiry-note">⏳ This invitation expires in <strong>7 days</strong>.</p>

                  <hr class="divider" />

                  <p style="font-size:14px; color:#6b7280; text-align:center; margin:0;">
                    Don't have an account yet? You'll be prompted to create one when you accept.
                  </p>

                </div>

                <!-- FOOTER -->
                <div class="footer">
                  <p>
                    Sent from <span class="brand">Schedulfy</span> &middot; 
                    <a href="#" style="color:#9ca3af; text-decoration:none;">Unsubscribe</a>
                  </p>
                  <p style="margin-top:4px; font-size:12px;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>

              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // --- Plain text fallback (optional but good practice) ---
  const textContent = `
    ${inviterName} has invited you to join ${workspaceName} on Schedulfy.

    Accept your invitation here:
    ${inviteLink}

    Or use this invite code: ${inviteCode}

    This invitation expires in 7 days.
    If you don't have a Schedulfy account yet, you'll be prompted to create one.
  `;

  const mailOptions = {
    from: `"${process.env.COMPANY_NAME || 'Schedulfy'}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: ` ${inviterName} invited you to ${workspaceName}`,
    html: htmlContent,
    text: textContent,
  };

  try {
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const transporter = createTransporter();

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(' Invitation email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        lastError = error;
        const transientError = ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ENETUNREACH'].includes(error.code);

        if (!transientError || attempt === 2) throw error;
        console.warn(' SMTP connection failed; retrying invitation email...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw lastError;
  } catch (error) {
    console.error(' Failed to send invitation email:', error);
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }
};