import userAuth from "../model/user.model.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { validatePassword } from "../utils/validatePassword.js";
import {
  signinValidation,
  signupValidation,
} from "../validation/user.validation.js";
import redisClient from "../config/redis.js";
import { emailQueue } from "../queues/email.queue.js";
dotenv.config();

export const signup = async (req, res) => {
  try {
    const { error } = signupValidation.validate(req.body);
    if (error) return res.status(400).json(error.details[0].message);
    const { name, email, password, role } = req.body;
    const existingUser = await userAuth.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const newUser = new userAuth({ name, email, password: hashPassword, role });
    await newUser.save();

    // Email verification token generation
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    await emailQueue.add(
      "signup-verification",
      {
        toEmail: email,
        token,
        userName: name,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
    // sendVerificationEmail(email,token,name)
    // .then(()=>console.log("Email send to your mail address"))
    // .catch((err)=>console.log(err))
    res
      .status(201)
      .json({
        message: "User registered successfully, Verification mail send",
      });
  } catch (error) {
    res.status(500).json(error);
  }
};

export const signin = async (req, res) => {
  try {
    const { error } = signinValidation.validate(req.body);
    if (error) return res.status(400).json(error.details[0].message);

    const { email, password } = req.body;
    const user = await userAuth.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      // send verification email
      const token = jwt.sign(
        { userId: user._id, name: user.name, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      await emailQueue.add(
        "send-verification-email",
        {
          toEmail: user.email,
          token,
          userName: user.name,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: true,
        }
      );
      return res
        .status(401)
        .json({ message: "Email not verified. Verification mail sent." });
    }

    // Generate accessToken
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN,
      { expiresIn: "15m" }
    );

    // Generate refreshToken
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN,
      { expiresIn: "7d" }
    );

    // Store tokens in Redis
    await redisClient.set(`accessToken:${user._id}`, accessToken, { EX: 900 }); // 15 min
    await redisClient.set(`refreshToken:${user._id}`, refreshToken, {
      EX: 7 * 24 * 3600,
    }); // 7 days
    await redisClient.set(`session:${user._id}`, `${user.email}`, {
      EX: 7 * 24 * 60 * 60,
    });
    // Set cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
    });

    res.json({ accessToken });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ message: "Refresh token missing" });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
    if (!decoded)
      return res.status(403).json({ message: "Invalid refresh token" });

    const storedRefreshToken = await redisClient.get(
      `refreshToken:${decoded.userId}`
    );
    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      return res
        .status(403)
        .json({ message: "Refresh token invalid or expired" });
    }

    // Generate new accessToken
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.ACCESS_TOKEN,
      { expiresIn: "15m" }
    );

    // Optional: generate new refreshToken (rotate refresh tokens)
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      process.env.REFRESH_TOKEN,
      { expiresIn: "7d" }
    );

    // Store in Redis
    await redisClient.set(`accessToken:${decoded.userId}`, newAccessToken, {
      EX: 900,
    });
    await redisClient.set(`refreshToken:${decoded.userId}`, newRefreshToken, {
      EX: 7 * 24 * 3600,
    });

    // Update cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res
      .status(403)
      .json({
        message: "Invalid or expired refresh token",
        error: err.message,
      });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    if (!decoded)
      return res.status(401).json({ message: "Invalid or expired token" });
    await redisClient.del(`session:${decoded.userId}`);
    await redisClient.del(`accessToken:${decoded.userId}`);
    await redisClient.del(`refreshToken:${decoded.userId}`);
    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });

    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).json(error);
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Step 1: Try to verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use JWT_SECRET (not ACCESS_TOKEN)

    // Step 2: Token is valid → verify user
    const user = await userAuth.findOne({ email: decoded.email });
    if (!user) {
      return res.status(400).json({ message: "Invalid user" });
    }

    if (user.isVerified) {
      return res.json({ message: "Email already verified. You can log in." });
    }

    user.isVerified = true;
    await user.save();

    return res.json({ message: "Email verified successfully!" });
  } catch (error) {
    // Step 3: Handle JWT errors (expired, invalid, etc.)
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      try {
        // Extract email from expired/invalid token (unsafe verify)
        const decoded = jwt.decode(token); // decode without verification
        if (!decoded || !decoded.email) {
          return res.status(400).json({ message: "Invalid token format" });
        }

        const user = await userAuth.findOne({ email: decoded.email });
        if (!user) {
          return res.status(400).json({ message: "User not found" });
        }

        if (user.isVerified) {
          return res.json({
            message: "Email already verified. You can log in.",
          });
        }

        // Generate NEW verification token
        const newToken = jwt.sign(
          { email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "10m" }
        );

        // Resend verification email
        await emailQueue.add(
          "resend-verification-email",
          {
            toEmail: user.email,
            newToken,
            userName: user.name,
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: true,
          }
        );

        return res.status(200).json({
          message:
            "Verification link expired. A new link has been sent to your email.",
          resent: true,
        });
      } catch (decodeError) {
        console.log("Failed to decode expired token:", decodeError);
        return res.status(400).json({ message: "Invalid token" });
      }
    }

    // Any other error (DB, server, etc.)
    console.log("Verify email error:", error);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });
    const user = await userAuth.findOne({ email });
    if (!user) return res.status(404).json({ message: "Invalid user" });

    const forgetPasswordToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN,
      { expiresIn: "10m" }
    );

    await emailQueue.add(
      "forget-password-email",
      {
        toEmail: email,
        token: forgetPasswordToken,
        userName: user.name,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
      }
    );
    res.status(200).json({ message: "Reset mail send to your email" });
  } catch (error) {
    console.log(error);
    res.status(500).json("Internal server error: ", error);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const { valid, message } = validatePassword(newPassword);
    if (!valid) return res.status(400).json({ message });
    const decode = jwt.verify(token, process.env.ACCESS_TOKEN);
    const user = await userAuth.findById(decode.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json("Password reset successful");
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.trim().length === 0) {
      return res.status(400).json("Both the fields and required");
    }
    const { valid, message } = validatePassword(newPassword);
    if (!valid) return res.status(400).json({ message });
    const user = await userAuth.findById(userId);
    if (!user) return res.status(404).json("User not found");
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json("Old password is incorrect");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    redisClient.del(`session:${userId}`);
    redisClient.del(`accessToken:${userId}`);
    redisClient.del(`refreshToken:${userId}`);
    res.clearCookie("refreshToken");
    res.json({ message: "Password updated successfully, please login again" });
  } catch (error) {
    res.status(500).json("Internal server error", error);
  }
};
