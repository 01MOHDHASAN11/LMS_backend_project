import * as brevo from '@getbrevo/brevo';
import dotenv from "dotenv";
dotenv.config();

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export const sendCourseReviewEmail = async (
  toEmail,
  instructorName,
  courseTitle,
  status,
  feedback = ""
) => {
  const isApproved = status === "approved";

  const subject = isApproved
    ? "Your Course Has Been Approved 🎉"
    : "Your Course Review Needs Changes";

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
      
      <div style="background-color: ${isApproved ? '#16a34a' : '#dc2626'}; padding: 20px;">
        <h2 style="color: #ffffff; margin: 0;">
          ${isApproved ? 'Course Approved! 🎉' : 'Course Review Results'}
        </h2>
      </div>

      <div style="padding: 30px; color: #333333;">
        <p style="font-size: 16px;">Hello <strong>${instructorName}</strong>,</p>

        <p style="font-size: 15px; line-height: 1.6;">
          Your course <strong>"${courseTitle}"</strong> has been reviewed by our team.
        </p>

        ${
          isApproved
            ? `
            <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
              <p style="margin: 0; font-size: 15px; color: #16a34a;">
                ✅ <strong>Good news!</strong> Your course has been approved and is now live on the platform.
              </p>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #555;">
              Learners can now enroll and access your content. Congratulations on this achievement!
            </p>

            ${
              feedback
                ? `<div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
                     <p style="margin: 0; font-size: 14px;"><strong>Reviewer Note:</strong> ${feedback}</p>
                   </div>`
                : ""
            }
            `
            : `
            <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p style="margin: 0; font-size: 15px; color: #dc2626;">
                ❌ <strong>Your course was not approved at this time.</strong>
              </p>
            </div>

            ${
              feedback
                ? `
                <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
                  <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Reviewer Feedback:</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #555;">${feedback}</p>
                </div>
                `
                : `
                <p style="font-size: 14px; color: #555;">No specific feedback was provided.</p>
                `
            }

            <p style="font-size: 14px; color: #555; margin-top: 16px;">
              You may update your course content and submit it again for review.
            </p>
            `
        }

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 12px; color: #888;">
          If you have any questions, feel free to contact our support team.
        </p>

        <p style="font-size: 12px; color: #888;">
          Regards,<br/>
          <strong>Course Review Team</strong>
        </p>
      </div>
    </div>
  </div>
  `;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email: toEmail, name: instructorName }];
  sendSmtpEmail.sender = { 
    email: process.env.EMAIL_USER, 
    name: "Course Review Team" 
  };
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Course review email (${status}) sent to ${instructorName} - Message ID: ${result.body.messageId}`);
    return result;
  } catch (error) {
    console.error("❌ Error sending course review email:", error.response?.body || error.message);
    throw error;
  }
};