// backend/src/test-email.js
import dotenv from 'dotenv';
dotenv.config();
import { sendInvitationEmail } from './services/emailService.js';

const testEmail = async () => {
  console.log('📧 Testing email configuration...');
  console.log('📧 SMTP_USER:', process.env.SMTP_USER);
  console.log('📧 SMTP_PASS set?', process.env.SMTP_PASS ? '✅ Yes' : '❌ No');
  console.log('📧 SMTP_HOST:', process.env.SMTP_HOST);
  
  try {
    const result = await sendInvitationEmail({
      email: 'kojobaffs@gmail.com', // Your email to test
      workspaceName: 'Schedulfy Team',
      inviterName: 'Schedulfy User',
      inviteCode: 'TEST123',
      inviteToken: 'test-token-123',
      frontendUrl: 'http://localhost:5173',
    });
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Check your inbox (and spam folder)');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Error message:', error.message);
  }
};

testEmail();