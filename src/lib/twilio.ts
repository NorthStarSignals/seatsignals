/**
 * Thin wrapper around Twilio's REST API.
 *
 * Auth: Account SID + Auth Token (Basic auth). No OAuth.
 * Merchants find these at https://console.twilio.com — top of the dashboard.
 *
 * For MVP we support:
 *   - Validating a credential pair (GET account resource)
 *   - Listing owned phone numbers (so they can pick a sender)
 *   - Sending a single SMS
 *
 * Production-grade: add retry on 429, signature validation for inbound webhooks,
 * and messaging service SID support for A2P 10DLC.
 */

const BASE = 'https://api.twilio.com/2010-04-01';

function authHeader(accountSid: string, authToken: string): string {
  const token = Buffer.from(`${accountSid.trim()}:${authToken.trim()}`).toString('base64');
  return `Basic ${token}`;
}

interface TwilioAccountResp {
  sid: string;
  friendly_name: string;
  status: string;
  type: string;
}

export interface TwilioAccount {
  sid: string;
  friendly_name: string;
  status: string;
  type: string;
}

export async function getAccount(accountSid: string, authToken: string): Promise<TwilioAccount> {
  const res = await fetch(`${BASE}/Accounts/${accountSid.trim()}.json`, {
    headers: { Authorization: authHeader(accountSid, authToken) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio auth failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as TwilioAccountResp;
  return {
    sid: data.sid,
    friendly_name: data.friendly_name,
    status: data.status,
    type: data.type,
  };
}

export interface TwilioPhoneNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
  capabilities: { sms?: boolean; mms?: boolean; voice?: boolean };
}

interface PhoneNumbersResp {
  incoming_phone_numbers: TwilioPhoneNumber[];
}

export async function listPhoneNumbers(
  accountSid: string,
  authToken: string
): Promise<TwilioPhoneNumber[]> {
  const res = await fetch(
    `${BASE}/Accounts/${accountSid.trim()}/IncomingPhoneNumbers.json?PageSize=50`,
    { headers: { Authorization: authHeader(accountSid, authToken) } }
  );
  if (!res.ok) throw new Error(`Twilio list numbers failed: ${res.status}`);
  const body = (await res.json()) as PhoneNumbersResp;
  return body.incoming_phone_numbers || [];
}

export interface TwilioMessage {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  date_created: string;
  error_code: number | null;
  error_message: string | null;
}

export async function sendSms(params: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<TwilioMessage> {
  const form = new URLSearchParams({
    From: params.from,
    To: params.to,
    Body: params.body,
  });
  const res = await fetch(`${BASE}/Accounts/${params.accountSid.trim()}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(params.accountSid, params.authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Twilio send failed: ${res.status} ${data.message || data.detail || JSON.stringify(data).slice(0, 300)}`
    );
  }
  return data as TwilioMessage;
}
