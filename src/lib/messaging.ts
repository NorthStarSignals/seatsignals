// SMS via Twilio
export async function sendSMS(to: string, body: string): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
      console.log('[SMS Skipped] Twilio not configured. Message:', body);
      return false;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });

    return res.ok;
  } catch (error) {
    console.error('[SMS Error]', error);
    return false;
  }
}

// Email via SendGrid
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.log('[Email Skipped] SendGrid not configured. To:', to, 'Subject:', subject);
      return false;
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@seatsignals.com', name: 'SeatSignals' },
        subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });

    return res.ok || res.status === 202;
  } catch (error) {
    console.error('[Email Error]', error);
    return false;
  }
}
