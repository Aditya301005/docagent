const sendEmail = async (to, subject, text, html) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'adityapal48354@gmail.com';

  if (!apiKey) {
    console.error('❌ BREVO_API_KEY is not defined in environment variables!');
    return null;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'DocAgent',
          email: senderEmail,
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        textContent: text,
        htmlContent: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via Brevo API');
    }

    console.log('📬 Email successfully sent via Brevo API! Message ID:', data.messageId);
    return data;
  } catch (error) {
    console.error('⚠️ Brevo Email sending failed ⚠️');
    console.error('Error Details:', error.message);
    return null;
  }
};

module.exports = { sendEmail };
