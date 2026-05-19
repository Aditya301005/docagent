const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"DocAgent Auth" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('⚠️ Render Free Tier SMTP Blocked Email ⚠️');
    console.error('Email sending failed, but OTP is visible above or in authController. Not throwing error so registration can continue.');
    console.error('Error Details:', error.message);
    // Do not throw error so we don't crash the registration process
    return null;
  }
};

module.exports = { sendEmail };
