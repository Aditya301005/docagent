const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');
const { sendEmail } = require('../config/email');

const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    // If user exists and is already verified, block them
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ detail: 'Email already registered and verified. Please log in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60000); // 15 minutes

    if (existingUser && !existingUser.isVerified) {
      // Allow unverified user to "re-register" (updates their info and sends new OTP)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: hashedPassword,
          verificationToken: otp,
          verificationTokenExpiry: otpExpiry,
        },
      });
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          verificationToken: otp,
          verificationTokenExpiry: otpExpiry,
        },
      });
    }

    // Send verification email with OTP
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering with DocAgent! Please use the following 6-digit code to verify your email address. This code will expire in 15 minutes.</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail(
      email,
      `[${otp}] DocAgent - Verification Code`,
      `Your verification code is: ${otp}`,
      emailHtml
    );

    res.status(201).json({ message: 'Verification code sent. Please check your email for the OTP.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error during registration' });
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const user = await prisma.user.findFirst({ 
      where: { 
        email: email,
        verificationToken: otp,
        verificationTokenExpiry: { gt: new Date() }
      } 
    });

    if (!user) {
      return res.status(400).json({ detail: 'Invalid or expired OTP' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    // Send Welcome Email
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to DocAgent! 🎉</h2>
        <p>Hi ${user.name},</p>
        <p>Your email has been successfully verified and your registration is complete.</p>
        <p>You can now log in to the app and start using DocAgent.</p>
      </div>
    `;
    await sendEmail(
      user.email,
      'Welcome to DocAgent!',
      'Your registration is complete.',
      welcomeHtml
    );

    // Automatically issue an access token upon verification (optional, but good UX)
    const accessToken = generateToken({ id: user.id, email: user.email });

    res.status(200).json({ 
      message: 'Email verified successfully', 
      access_token: accessToken, 
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error during verification' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ detail: 'Please verify your email before logging in' });
    }

    const accessToken = generateToken({ id: user.id, email: user.email });
    res.status(200).json({ access_token: accessToken, email: user.email, name: user.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error during login' });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Return 200 even if not found to prevent email enumeration
      return res.status(200).json({ message: 'If an account with that email exists, we sent a password reset link.' });
    }

    // Generate 6-digit OTP for reset
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetOtp,
        resetPasswordExpiry: resetTokenExpiry,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your DocAgent account. Please use the following 6-digit code to reset your password. This code will expire in 15 minutes.</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 5px; margin: 20px 0;">
          ${resetOtp}
        </div>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `;

    await sendEmail(
      email,
      `[${resetOtp}] DocAgent - Password Reset Code`,
      `Your password reset code is: ${resetOtp}`,
      emailHtml
    );

    res.status(200).json({ message: 'If an account exists, we sent a 6-digit reset code.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error during forgot password' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ detail: 'Invalid or expired password reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error during password reset' });
  }
};

// Get current user (me endpoint)
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, isVerified: true, createdAt: true }
    });
    
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error fetching user details' });
  }
};

// Change Password (Authenticated)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ detail: 'Current password is incorrect' });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error during password update' });
  }
};

// Update current user (name)
exports.updateMe = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ detail: 'Name is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, isVerified: true }
    });

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ detail: 'Server error during profile update' });
  }
};
