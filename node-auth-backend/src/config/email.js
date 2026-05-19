const sendEmail = async (to, subject, text, html) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not defined in environment variables!');
    return null;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DocAgent <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        text: text,
        html: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via Resend API');
    }

    console.log('📬 Email successfully sent via Resend API! Message ID:', data.id);
    return data;
  } catch (error) {
    console.error('⚠️ Resend Email sending failed ⚠️');
    console.error('Error Details:', error.message);
    return null;
  }
};

module.exports = { sendEmail };
