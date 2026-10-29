"use strict";

const nodemailer = require("nodemailer");

/**
 * Configure Nodemailer transport with Gmail or custom SMTP.
 * Supports:
 * - Gmail: EMAIL_USER + EMAIL_PASS (or GMAIL_APP_PASSWORD)
 * - Custom SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || process.env.ADMIN_EMAIL || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "").trim().replace(/\s+/g, "");

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  if (pass) {
    // Gmail default transport
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user || "zishanshafique8@gmail.com",
        pass
      }
    });
  }

  return null;
}

/**
 * Sends a real password reset OTP email to the user's inbox.
 * @param {Object} options
 * @param {string} options.toEmail
 * @param {string} options.otp
 * @param {string} [options.userName]
 * @returns {Promise<{ success: boolean, emailSent: boolean, messageId?: string, error?: string }>}
 */
async function sendPasswordResetEmail({ toEmail, otp, userName = "Valued Customer" }) {
  const cleanEmail = (toEmail || "").trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, emailSent: false, error: "Recipient email is required" };
  }

  const transporter = getTransporter();
  const senderEmail = (process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.ADMIN_EMAIL || "zishanshafique8@gmail.com").trim();

  if (!transporter) {
    console.warn(
      `[Mailer Notice] Real email transport not active. Set EMAIL_PASS (16-character Gmail App Password) in .env to dispatch OTP to real Gmail inbox: ${cleanEmail}`
    );
    return {
      success: true,
      emailSent: false,
      notice: "SMTP credentials not configured in .env. Please set EMAIL_PASS to send real emails to your Gmail inbox."
    };
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZESH-TECH Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #090d16 0%, #1e293b 100%); padding: 32px 28px; text-align: center;">
        <div style="font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; margin-bottom: 4px;">
          ZESH–TECH
        </div>
        <div style="font-size: 12px; color: #38bdf8; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase;">
          Enterprise Retail Suite • Barh, Patna
        </div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 32px 28px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px; line-height: 1.3;">
          Password Reset Verification Code
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
          Hello <strong style="color: #0f172a;">${escapeHtml(userName)}</strong>,<br>
          We received a request to reset the password for your ZESH-TECH account (<span style="color: #2563eb; font-weight: 600;">${escapeHtml(cleanEmail)}</span>).
        </p>

        <!-- OTP Highlight Box -->
        <div style="background: #f8fafc; border: 2px dashed #38bdf8; border-radius: 14px; padding: 24px; text-align: center; margin: 0 0 24px;">
          <div style="font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
            Your 6-Digit Password Reset OTP
          </div>
          <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #0284c7; font-family: 'JetBrains Mono', Consolas, Monaco, monospace; margin: 4px 0;">
            ${otp}
          </div>
          <div style="display: inline-block; margin-top: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 20px; padding: 4px 12px; font-size: 11.5px; color: #dc2626; font-weight: 700;">
            ⏳ Valid for 10 minutes only
          </div>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0 0 16px;">
          Enter this 6-digit code on the ZESH-TECH password reset screen to set your new password.
        </p>

        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
          <p style="font-size: 12px; line-height: 1.5; color: #92400e; margin: 0;">
            <strong>Security Notice:</strong> Never share this OTP with anyone, including ZESH-TECH staff. If you did not request this password reset, please ignore this email or contact our support team. Your account remains safe.
          </p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          Need assistance? WhatsApp or call our Barh store counter: <strong>+91 7903746116</strong>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
          © 2026 ZESH-TECH Enterprise Retail Suite • Main Road, Station Road, Barh, Patna, Bihar
        </div>
        <div style="font-size: 10.5px; color: #94a3b8;">
          GST Registered: 10GURPS1052R1ZZ • Engineered by Aman Raj
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
ZESH-TECH PASSWORD RESET VERIFICATION

Hello ${userName},

Your 6-Digit Password Reset OTP is: ${otp}

(Valid for 10 minutes). Do not share this OTP with anyone.

If you did not request this, please ignore this email.

ZESH-TECH Enterprise Retail Suite • Barh, Patna
Support: +91 7903746116 • Engineered by Aman Raj
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"ZESH-TECH Security" <${senderEmail}>`,
      to: cleanEmail,
      subject: `🔐 Your ZESH-TECH Password Reset OTP: ${otp}`,
      text: textContent,
      html: htmlContent
    });

    console.log(`[Mailer] Real email successfully sent to ${cleanEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      emailSent: true,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[Mailer Error] Failed to send email to ${cleanEmail}:`, err.message);
    return {
      success: false,
      emailSent: false,
      error: err.message
    };
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  sendPasswordResetEmail,
  getTransporter
};
