const nodemailer = require('nodemailer');
const { google } = require('googleapis');

/**
 * Send an email from the user's own Gmail account via OAuth2.
 *
 * The user grants gmail.send permission during Google OAuth login.
 * Their access/refresh tokens are stored in the User document.
 * Emails appear in the user's "Sent" folder — they see the magic.
 *
 * Falls back to console logging if tokens are missing (MVP/testing mode).
 *
 * @param {object} senderUser - Full user document (with gmailAccessToken, gmailRefreshToken)
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {object} { success, messageId }
 */
async function sendEmail(senderUser, toEmail, subject, body) {
  // If user has Gmail tokens and Google OAuth is configured, send real email
  if (
    senderUser.gmailRefreshToken &&
    process.env.GOOGLE_CLIENT_ID &&
    !process.env.GOOGLE_CLIENT_ID.startsWith('dummy')
  ) {
    return sendViaGmail(senderUser, toEmail, subject, body);
  }

  // Fallback: log to console (MVP testing mode)
  return sendMock(senderUser.email, toEmail, subject, body);
}

/**
 * Real Gmail sending via OAuth2
 */
async function sendViaGmail(senderUser, toEmail, subject, body) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/auth/google/callback`
    );

    oauth2Client.setCredentials({
      access_token: senderUser.gmailAccessToken,
      refresh_token: senderUser.gmailRefreshToken,
    });

    // This automatically refreshes the access token if expired
    const { token } = await oauth2Client.getAccessToken();

    // If token was refreshed, update in DB
    if (token && token !== senderUser.gmailAccessToken) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(senderUser._id, {
        $set: { gmailAccessToken: token },
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: senderUser.email,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: senderUser.gmailRefreshToken,
        accessToken: token,
      },
    });

    const result = await transporter.sendMail({
      from: `${senderUser.name} <${senderUser.email}>`,
      to: toEmail,
      subject,
      text: body,
    });

    console.log('[EmailService] GMAIL SENT from:', senderUser.email, '→', toEmail, '| id:', result.messageId);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('[EmailService] Gmail send failed:', error.message);

    // If token expired and refresh failed, log it
    if (error.message.includes('invalid_grant') || error.message.includes('Token')) {
      console.error('[EmailService] Token expired for', senderUser.email, '— user needs to re-login');
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Mock sending — logs to console (for testing without Gmail setup)
 */
function sendMock(fromEmail, toEmail, subject, body) {
  console.log('='.repeat(60));
  console.log('[EmailService] EMAIL SENT (mock — no Gmail tokens)');
  console.log(`From: ${fromEmail}`);
  console.log(`To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log('='.repeat(60));

  return {
    success: true,
    messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };
}

module.exports = { sendEmail };
