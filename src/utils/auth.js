// This implementation uses fetch() directly to Supabase's REST API from the browser.
// It queries the `users` table (columns: id, user, pass) and compares the password
// on the client. WARNING: This is insecure if passwords are stored in plaintext.
// Prefer using Supabase Auth or a server-side check against hashed passwords.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Supabase URL/ANON key not found in env. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
}

export async function login({ email, password }) {
  const username = email; // we treat the email field as username

  const url = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/users?select=id,user,pass&user=eq.${encodeURIComponent(username)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY || '',
      Authorization: `Bearer ${SUPABASE_ANON_KEY || ''}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error querying Supabase: ${res.status} ${text}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  const row = rows[0];
  const stored = row.pass || '';

  // Plaintext compare (insecure). If you store bcrypt hashes, compare using bcrypt in server.
  if (stored !== password) {
    throw new Error('Credenciales inválidas');
  }

  const token = `user-${row.id}-${Date.now()}`;
  localStorage.setItem('token', token);
  return { token, user: { id: row.id, user: row.user } };
}

export async function logout() {
  localStorage.removeItem('token');
}
