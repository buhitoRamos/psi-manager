import { SUPABASE_ANON_KEY } from './supabaseClient';

const SUPPORT_CHAT_URL =
  process.env.REACT_APP_SUPPORT_CHAT_URL ||
  'https://ljynujodigqqujjvyoud.supabase.co/functions/v1/support-chat';

function getHeaders() {
  if (!SUPPORT_CHAT_URL) throw new Error('El servicio de soporte no está configurado.');
  if (!SUPABASE_ANON_KEY) throw new Error('Falta la clave pública del servicio de soporte.');
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function readResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('El servicio de soporte devolvió una respuesta inválida.');
  }
  if (!response.ok || data.error) {
    throw new Error(data.error || `Error del servicio de soporte (HTTP ${response.status}).`);
  }
  return data;
}

export async function fetchMembershipStatus(userEmail) {
  const response = await fetch(SUPPORT_CHAT_URL, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'membership_status',
      app: 'psi-manager',
      user_email: userEmail,
    }),
  });
  return readResponse(response);
}

export async function uploadPaymentReceipt(userEmail, file) {
  const form = new FormData();
  form.set('action', 'payment_receipt');
  form.set('app', 'psi-manager');
  form.set('user_email', userEmail);
  form.set('file', file);

  const response = await fetch(SUPPORT_CHAT_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: form,
  });
  return readResponse(response);
}
