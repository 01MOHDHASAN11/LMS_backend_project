import * as brevo from '@getbrevo/brevo';
import dotenv from "dotenv";
dotenv.config();

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export const sendUnblockStatusEmail = async (
  userEmail,
  userName,
  status,
  message = ""
) => {
  const subject =
    status === "approved"
      ? "Your Account Unblock Request Has Been Approved"
      : "Your Account Unblock Request Has Been Rejected";

  const htmlContent =
    status === "approved"
      ? `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <div style="background-color: #16a34a; padding: 20px;">
            <h2 style="color: #ffffff; margin: 0;">Account Unblock Approved</h2>
          </div>

          <div style="padding: 30px; color: #333333;">
            <p style="font-size: 16px;">Hello <strong>${userName}</strong>,</p>

            <p style="font-size: 15px; line-height: 1.6;">
              Your request to unblock your account has been <strong style="color: #16a34a;">approved</strong>.
            </p>

            <p style="font-size: 15px; line-height: 1.6;">
              You can now login again and continue using the platform normally.
            </p>

            ${
              message
                ? `<div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
                     <p style="margin: 0; font-size: 14px;"><strong>Admin Note:</strong> ${message}</p>
                   </div>`
                : ""
            }

            <p style="font-size: 14px; color: #555;">
              If you experience any issues, feel free to reach out to our support team.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

            <p style="font-size: 12px; color: #888;">
              Regards,<br/>
              Support Team
            </p>
          </div>
        </div>
      </div>
      `
      : `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <div style="background-color: #dc2626; padding: 20px;">
            <h2 style="color: #ffffff; margin: 0;">Account Unblock Rejected</h2>
          </div>

          <div style="padding: 30px; color: #333333;">
            <p style="font-size: 16px;">Hello <strong>${userName}</strong>,</p>

            <p style="font-size: 15px; line-height: 1.6;">
              Your request to unblock your account has been <strong style="color: #dc2626;">rejected</strong>.
            </p>

            <p style="font-size: 15px; line-height: 1.6;">
              Please review the reason below:
            </p>

            <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Admin Reason:</strong> ${message || "No additional reason was provided."}
              </p>
            </div>

            <p style="font-size: 14px; color: #555;">
              If you believe this is a mistake, you may submit a new request or contact support.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

            <p style="font-size: 12px; color: #888;">
              Regards,<br/>
              Support Team
            </p>
          </div>
        </div>
      </div>
      `;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email: userEmail, name: userName }];
  sendSmtpEmail.sender = { 
    email: process.env.EMAIL_USER, 
    name: "Support Team" 
  };
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Unblock status email (${status}) sent to ${userName} - Message ID: ${result.body.messageId}`);
    return result;
  } catch (error) {
    console.error("❌ Error sending unblock status email:", error.response?.body || error.message);
    throw error;
  }
};

export const sendInstructorVerificationEmail = async (
  toEmail,
  toName,
  status,
  message = ""
) => {
  const subject =
    status === "approved"
      ? "Your Instructor Verification is Approved"
      : "Your Instructor Verification is Rejected";

  const htmlContent =
    status === "approved"
      ? `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <div style="background-color: #16a34a; padding: 20px;">
            <h2 style="color: #ffffff; margin: 0;">Instructor Verification Approved</h2>
          </div>

          <div style="padding: 30px; color: #333333;">
            <p style="font-size: 16px;">Hello <strong>${toName}</strong>,</p>

            <p style="font-size: 15px; line-height: 1.6;">
              Congratulations! Your instructor verification request has been <strong style="color: #16a34a;">approved</strong>.
            </p>

            ${
              message
                ? `<div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
                     <p style="margin: 0; font-size: 14px;"><strong>Admin Note:</strong> ${message}</p>
                   </div>`
                : ""
            }

            <p style="font-size: 15px; line-height: 1.6;">
              You can now access all instructor features and start creating courses on our platform.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

            <p style="font-size: 12px; color: #888;">
              Regards,<br/>
              Support Team
            </p>
          </div>
        </div>
      </div>
      `
      : `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <div style="background-color: #dc2626; padding: 20px;">
            <h2 style="color: #ffffff; margin: 0;">Instructor Verification Rejected</h2>
          </div>

          <div style="padding: 30px; color: #333333;">
            <p style="font-size: 16px;">Hello <strong>${toName}</strong>,</p>

            <p style="font-size: 15px; line-height: 1.6;">
              Your instructor verification request has been <strong style="color: #dc2626;">rejected</strong>.
            </p>

            <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Reason:</strong> ${message || "No reason was provided."}
              </p>
            </div>

            <p style="font-size: 14px; color: #555;">
              You may update your details and submit a new verification request.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

            <p style="font-size: 12px; color: #888;">
              Regards,<br/>
              Support Team
            </p>
          </div>
        </div>
      </div>
      `;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email: toEmail, name: toName }];
  sendSmtpEmail.sender = { 
    email: process.env.EMAIL_USER, 
    name: "Support Team" 
  };
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Instructor verification email (${status}) sent to ${toName} - Message ID: ${result.body.messageId}`);
    return result;
  } catch (error) {
    console.error("❌ Error sending instructor verification email:", error.response?.body || error.message);
    throw error;
  }
};