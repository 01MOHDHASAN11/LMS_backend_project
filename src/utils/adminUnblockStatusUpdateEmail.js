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

export const sendUnblockStatusEmail = async (
  toEmail,
  userName,
  status,
  adminMessage = ""
) => {
  const subject =
    status === "approved"
      ? "Your Account Unblock Request Has Been Approved"
      : "Your Account Unblock Request Has Been Rejected";

  const htmlContent =
    status === "approved"
      ? `
      <div style="font-family:Arial; padding:20px;">
        <h2 style="color:#2d89ef;">Hello ${userName},</h2>
        <p>Your request to unblock your account has been <strong style="color:green;">approved</strong>.</p>
        <p>You can now login again and continue using the platform normally.</p>

        ${
          adminMessage
            ? `<p><strong>Admin Note:</strong> ${adminMessage}</p>`
            : ""
        }

        <p>If you experience any issue, feel free to reach out.</p>
        <br>
        <p>Regards,<br>Support Team</p>
      </div>
      `
      : `
      <div style="font-family:Arial; padding:20px;">
        <h2 style="color:#2d89ef;">Hello ${userName},</h2>
        <p>Your request to unblock your account has been <strong style="color:red;">rejected</strong>.</p>
        <p>Please review the reason below:</p>

        ${
          adminMessage
            ? `<p><strong>Admin Reason:</strong> ${adminMessage}</p>`
            : `<p>No additional reason was provided.</p>`
        }

        <p>If you believe this is a mistake, you may submit a new request.</p>
        <br>
        <p>Regards,<br>Support Team</p>
      </div>
      `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Unblock status email sent: ${status}`);
  } catch (error) {
    console.log("Error sending unblock status email:", error);
  }
};

export const sendInstructorVerificationEmail = async (
  toEmail,
  userName,
  status,
  adminMessage = ""
) => {
  const subject =
    status === "approved"
      ? "Your Instructor Verification is Approved"
      : "Your Instructor Verification is Rejected";

  const htmlContent =
    status === "approved"
      ? `
      <div style="font-family:Arial; padding:20px;">
        <h2>Hello ${userName},</h2>
        <p>Your instructor verification request has been <strong style="color:green;">approved</strong>.</p>

        ${
          adminMessage
            ? `<p><strong>Admin Note:</strong> ${adminMessage}</p>`
            : ""
        }

        <p>You can now access instructor features.</p>
        <br>
        <p>Regards,<br>Team</p>
      </div>
      `
      : `
      <div style="font-family:Arial; padding:20px;">
        <h2>Hello ${userName},</h2>
        <p>Your instructor verification request has been <strong style="color:red;">rejected</strong>.</p>

        ${
          adminMessage
            ? `<p><strong>Reason:</strong> ${adminMessage}</p>`
            : `<p>No reason was provided.</p>`
        }

        <p>You may update your details and submit again.</p>
        <br>
        <p>Regards,<br>Team</p>
      </div>
      `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject,
      html: htmlContent,
    });

    console.log(`Instructor verification email sent: ${status}`);
  } catch (error) {
    console.log("Error sending instructor verification email:", error);
  }
};
