const nodemailer = require('nodemailer');

// Create a reusable SMTP transporter from .env credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // true for port 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter on startup (non-fatal if it fails at boot time)
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP transporter verification failed:', error.message);
  } else {
    console.log('✅ SMTP transporter ready — connected to', process.env.SMTP_HOST);
  }
});

/**
 * Send an email via SMTP.
 * Signature is identical to the old Brevo version so authController.js needs no changes.
 * @param {string} to      - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text    - Plain-text fallback
 * @param {string} html    - HTML body
 */
const sendEmail = async (to, subject, text, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP_USER or SMTP_PASS is not defined in environment variables!');
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: `"DocAgent" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('📬 Email sent via SMTP! Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('⚠️ SMTP email sending failed:', error.message);
    return null;
  }
};

module.exports = { sendEmail };
