import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendCourseReviewEmail = async ({
  toEmail,
  instructorName,
  courseTitle,
  status, // "approved" | "rejected"
  feedback = "",
}) => {
  const isApproved = status === "approved";

  const subject = isApproved
    ? "Your Course Has Been Approved 🎉"
    : "Your Course Review Needs Changes";

  const htmlContent = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f9f9f9; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; padding:24px; border-radius:8px;">
      
      <h2 style="color:#333;">Hello ${instructorName},</h2>

      <p style="font-size:15px; color:#555;">
        Your course <strong>"${courseTitle}"</strong> has been reviewed by our team.
      </p>

      ${
        isApproved
          ? `
          <p style="font-size:16px; color:#2e7d32;">
            ✅ <strong>Good news!</strong> Your course has been <strong>approved</strong> and is now live on the platform.
          </p>
          <p style="color:#555;">
            Learners can now enroll and access your content.
          </p>
          `
          : `
          <p style="font-size:16px; color:#c62828;">
            ❌ <strong>Your course was not approved at this time.</strong>
          </p>
          ${
            feedback
              ? `
              <div style="margin-top:12px; padding:12px; background:#fff3f3; border-left:4px solid #e53935;">
                <strong>Reviewer Feedback:</strong>
                <p style="margin:8px 0 0; color:#555;">${feedback}</p>
              </div>
              `
              : `
              <p style="color:#555;">No specific feedback was provided.</p>
              `
          }
          <p style="margin-top:12px; color:#555;">
            You may update your course and submit it again for review.
          </p>
          `
      }

      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;">

      <p style="font-size:13px; color:#888;">
        If you have any questions, feel free to contact our support team.
      </p>

      <p style="font-size:14px; color:#555;">
        Regards,<br>
        <strong>Course Review Team</strong>
      </p>
    </div>
  </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log(`Course review email sent (${status})`);
  } catch (error) {
    console.error("Error sending course review email:", error);
  }
};
