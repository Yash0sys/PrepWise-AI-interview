import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER || "yashsinghrawat07@gmail.com";
const EMAIL_PASS = (process.env.EMAIL_PASS || "krqj czbx nsna wppq").replace(/\s+/g, "");
const APP_NAME = process.env.APP_NAME || "Prep";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export async function sendOtpEmail(toEmail, otp) {
  const mailOptions = {
    from: `"${APP_NAME} Verification" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} is your ${APP_NAME} login verification code`,
    text: `Your ${APP_NAME} verification code is: ${otp}. It will expire in 5 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #0b0c10; color: #ffffff; border-radius: 16px; border: 1px solid #1f232b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #cac5fe; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${APP_NAME}</h1>
          <p style="color: #8f95a5; font-size: 14px; margin-top: 6px;">AI-Powered Mock Interview Platform</p>
        </div>
        
        <div style="background-color: #14171f; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #232734;">
          <p style="color: #d6e0ff; font-size: 15px; margin: 0 0 16px 0;">Your One-Time Password (OTP) for login:</p>
          <div style="display: inline-block; padding: 14px 28px; background-color: #1d212c; border-radius: 10px; border: 1px solid #cac5fe; margin: 10px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; color: #cac5fe; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #8f95a5; font-size: 13px; margin: 16px 0 0 0;">This code is valid for exactly <strong style="color: #cac5fe;">5 minutes</strong>.</p>
        </div>

        <div style="margin-top: 28px; text-align: center; color: #62697b; font-size: 12px;">
          <p style="margin: 0;">If you did not request this code, you can safely ignore this email.</p>
          <p style="margin: 6px 0 0 0;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
