import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port:587,
  secure:false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const resetPasswordEmail = async (toEmail, token, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "password reset email",
    text: `Hi ${userName}, please click the link below to reset your password\n\n\t ${process.env.FRONTEND_URL}/resetpassword/${token}\n\n This link will expire in 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("reset mail send to user");
  } catch (error) {
    console.log("Error in send mail to the user: ", error);
  }
};
