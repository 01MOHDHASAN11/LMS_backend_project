import nodemailer from "nodemailer";
import sendinBlueTransport from "nodemailer-sendinblue";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport(
  sendinBlueTransport({
    apiKey:process.env.BREVO_API_KEY
  })
);

export const sendVerificationEmail = async (toEmail, token, userName) => {
  const verifyLink = `${process.env.FRONTEND_URL}/verify/${token}`;

  const mailOptions = {
    from: `"Support Team" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <div style="background-color: #16a34a; padding: 20px;">
            <h2 style="color: #ffffff; margin: 0;">Email Verification</h2>
          </div>

          <div style="padding: 30px; color: #333333;">
            <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>

            <p style="font-size: 15px; line-height: 1.6;">
              Thank you for signing up! Please verify your email address by clicking the button below.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}"
                 style="background-color: #16a34a; color: #ffffff; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; font-weight: bold;
                        display: inline-block;">
                Verify Email
              </a>
            </div>

            <p style="font-size: 14px; color: #555;">
              This verification link will expire in <strong>10 minutes</strong>.
            </p>

            <p style="font-size: 14px; color: #555;">
              If you did not create an account, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

            <p style="font-size: 12px; color: #888;">
              If the button does not work, copy and paste this link into your browser:
              <br />
              <a href="${verifyLink}" style="color: #16a34a; word-break: break-all;">
                ${verifyLink}
              </a>
            </p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${userName}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};
