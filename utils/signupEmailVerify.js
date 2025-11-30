import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASSWORD
    }
})

export const sendVerificationEmail = async(toEmail,token,userName) =>{
    const mailOptions = {
        from:process.env.EMAIL_USER,
        to:toEmail,
        subject:"Verify your email",
        text:`Hi ${userName}, please click the link below to verify your email: 
        ${process.env.FRONTEND_URL}/verify/${token}

        This link will expire in 10 minutes
        `
    }

    try {
        await transporter.sendMail(mailOptions)
        console.log(`Email send to user ${userName}`)
    } catch (error) {
        console.log("Error sending verification mail: ",error)
    }
}