import * as brevo from '@getbrevo/brevo';
import dotenv from "dotenv";
dotenv.config();

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export const resetPasswordEmail = async (toEmail, token, userName) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  
  sendSmtpEmail.subject = "Reset Your Password";
  sendSmtpEmail.to = [{ email: toEmail, name: userName }];
  sendSmtpEmail.sender = { 
    email: process.env.EMAIL_USER, 
    name: "Support Team" 
  };
  sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        
        <div style="background-color: #dc2626; padding: 20px;">
          <h2 style="color: #ffffff; margin: 0;">Password Reset Request</h2>
        </div>

        <div style="padding: 30px; color: #333333;">
          <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>

          <p style="font-size: 15px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background-color: #dc2626; color: #ffffff; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;
                      display: inline-block;">
              Reset Password
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            This password reset link will expire in <strong>10 minutes</strong>.
          </p>

          <p style="font-size: 14px; color: #555;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

          <p style="font-size: 12px; color: #888;">
            If the button does not work, copy and paste this link into your browser:
            <br />
            <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">
              ${resetLink}
            </a>
          </p>

          <p style="font-size: 12px; color: #888; margin-top: 20px;">
            For security reasons, this link will only work once. If you need to reset your password again, please request a new reset link.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Password reset email sent to ${userName} - Message ID: ${result.body.messageId}`);
    return result;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error.response?.body || error.message);
    throw error;
  }
};