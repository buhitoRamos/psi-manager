// Helper utilities to query Supabase REST (PostgREST) directly using fetch.
// Usage: import { selectUsersByUser, insertUser, updateUserPass } from './lib/supabaseRest'
// WARNING: Using the ANON key from the client is public-facing; ensure RLS/policies are correct
// and do NOT expose or use service_role keys here.

const DEFAULT_SUPABASE_URL = 'https://ljynujodigqqujjvyoud.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeW51am9kaWdxcXVqanZ5b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTY4NTAsImV4cCI6MjA3Njk5Mjg1MH0.oCSsBjWbZl7w81E67H3VV3in7gX5tJAVPWZM2EG9UEo';

const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/,'');
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
// Developer convenience: when set to 'true', any found user will be accepted
// regardless of the `valid` flag returned by RPCs. ONLY enable for local testing.
const DEV_AUTH_BYPASS = (process.env.REACT_APP_AUTH_DEV_BYPASS || 'false') === 'true';

function headers(contentType = 'application/json') {
  const h = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json'
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}

async function fetchPost(path, body) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { method: 'POST', headers: headers('application/json'), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Supabase POST ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchPatch(path, body) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { method: 'PATCH', headers: headers('application/json'), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchDelete(path) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { method: 'DELETE', headers: headers('application/json') });
  if (!res.ok) throw new Error(`Supabase DELETE ${res.status}: ${await res.text()}`);
  return res.json();
}

// Examples for table `users` (columns: id, user, pass)
export async function selectUsersByUser(username) {
  console.debug('userName:', username);
  // GET /rest/v1/users?select=id,user,pass&user=eq.<username>
  // Use the eq.'value' form and percent-encode the username. This avoids issues with
  // characters that would otherwise be interpreted by the URL parser.
  // e.g. user=eq.'cc' -> encoded as user=eq.%27cc%27
  const path = `/rest/v1/users?select=id,user,pass&user=eq.%27${encodeURIComponent(username)}%27`;
  const url = `${SUPABASE_URL}${path}`;
  // Debugging: log the URL being requested (dev only)
  // eslint-disable-next-line no-console
  console.debug('[supabaseRest] GET', url);
  const res = await fetch(url, { method: 'GET', headers: headers(null) });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] response-status', res.status, await res.text());
    throw new Error(`Supabase GET ${res.status}`);
  }
  const json = await res.json();
  // eslint-disable-next-line no-console
  console.debug('[supabaseRest] response-json', json);
  return json;
}

export async function insertUser({ user, pass }) {
  // POST /rest/v1/users with Prefer: return=representation to get inserted row
  const path = `/rest/v1/users`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { 
    method: 'POST', 
    headers: {
      ...headers('application/json'),
      'Prefer': 'return=representation'
    }, 
    body: JSON.stringify({ user, pass }) 
  });
  if (!res.ok) throw new Error(`Supabase POST ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function updateUserPass(id, newPass) {
  // PATCH /rest/v1/users?id=eq.<id> with Prefer: return=representation
  const path = `/rest/v1/users?id=eq.${encodeURIComponent(id)}`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { 
    method: 'PATCH', 
    headers: {
      ...headers('application/json'),
      'Prefer': 'return=representation'
    }, 
    body: JSON.stringify({ pass: newPass }) 
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function deleteUser(id) {
  const path = `/rest/v1/users?id=eq.${encodeURIComponent(id)}`;
  return fetchDelete(path);
}

// Call an RPC (Postgres function) named <fnName>
export async function callRpc(fnName, params = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const res = await fetch(url, { method: 'POST', headers: headers('application/json'), body: JSON.stringify(params) });
  if (!res.ok) {
    // Try to parse JSON error body for structured info
    let text = await res.text();
    try {
      const json = JSON.parse(text);
      const err = new Error(json.message || `Supabase RPC ${res.status}`);
      err.code = json.code;
      err.details = json.details;
      err.hint = json.hint;
      throw err;
    } catch (e) {
      // not JSON
      throw new Error(`Supabase RPC ${res.status}: ${text}`);
    }
  }
  return res.json();
}

/**
 * authCheck calls a Postgres RPC function `auth_check(u text, p text)` which should
 * return a row like { valid: boolean, user_id: int, user_name: text } or an empty array.
 * Create the RPC in your Supabase SQL editor (see sql/auth_check.sql included).
 */
export async function authCheck(username, password) {
  // Try secure RPC (uses pgcrypto/crypt) first, then fall back to legacy auth_check
  try {
    const res = await callRpc('auth_check_secure', { u: username, p: password });
   console.warn('res;',res);
    if (Array.isArray(res) && res.length > 0) {
      if (DEV_AUTH_BYPASS) {
        // force valid for dev bypass
        const forced = { ...res[0], valid: true };
        return forced;
      }
      return res[0];
    }
  } catch (err) {
    console.warn('[supabaseRest] auth_check_secure failed, falling back to auth_check:', err);
    // If PostgREST reports ambiguous overloads or function-not-found (PGRST203/PGRST202),
    // try a direct table query and do a plaintext comparison as a last-resort fallback.
    const code = err && err.code ? err.code : null;
    const msg = err && err.message ? err.message : String(err);
    if (code === 'PGRST203' || code === 'PGRST202' || msg.includes('Could not choose the best candidate') || msg.includes('Could not find the function')) {
      try {
        const rows = await selectUsersByUser(username);
        console.warn('row:', rows);
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          // If password stored in DB equals provided password (plaintext storage), accept.
          if (row.pass === password) {
            return { valid: true, user_id: row.id, user_name: row.user };
          }
          // If stored pass looks like a crypt/bcrypt hash (starts with $), we cannot verify client-side.
          if (typeof row.pass === 'string' && row.pass.startsWith('$')) {
            // Return known-failure so caller can show an informative message.
            return { valid: false, user_id: row.id, user_name: row.user };
          }
        }
      } catch (tblErr) {
        // eslint-disable-next-line no-console
        console.debug('[supabaseRest] fallback table lookup failed:', tblErr);
      }
    }
  }

  try {
    const res2 = await callRpc('auth_check', { u: username, p: password });
    console.warn('res2;',res2);
    if (Array.isArray(res2) && res2.length > 0) {
      if (DEV_AUTH_BYPASS) return { ...res2[0], valid: true };
      return res2[0];
    }
  } catch (err2) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] auth_check fallback failed:', err2.message || err2);
  }

  // Last-resort: try a temporary plaintext RPC if present (auth_check_plain).
  try {
    const res3 = await callRpc('auth_check_plain', { u: username, p: password });
    if (Array.isArray(res3) && res3.length > 0) {
      if (DEV_AUTH_BYPASS) return { ...res3[0], valid: true };
      return res3[0];
    }
  } catch (err3) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] auth_check_plain failed or not present:', err3.message || err3);
  }

  return null;
}

/**
 * getPatientsByUserId obtiene todos los pacientes filtrados por user_id
 * usando RPC de Supabase (igual que authCheck)
 */
export async function getPatientsByUserId(userId) {
  try {
    // Usar RPC get_patients_by_user_id igual que auth_check
    const result = await callRpc('get_patients_by_user_id', { user_id_param: userId });
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] getPatientsByUserId result:', result);
    
    // El RPC devuelve directamente el array de pacientes
    return Array.isArray(result) ? result : [];
    
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug('[supabaseRest] getPatientsByUserId failed:', err.message || err);
    throw err;
  }
}

// Raw SQL is NOT supported via REST; if you need complex queries use RPC functions or the
// Supabase client. Remember to enforce RLS and do server-side checks for sensitive ops.

/**
 * updatePatient actualiza los datos de un paciente específico
 */
async function updatePatient(patientId, patientData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/patients?id=eq.${patientId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(patientData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error updating patient:', data);
      throw new Error(data.message || 'Error al actualizar el paciente');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in updatePatient:', error);
    throw error;
  }
}

const supabaseRest = {
  selectUsersByUser,
  insertUser,
  updateUserPass,
  deleteUser,
  callRpc,
  getPatientsByUserId,
  updatePatient,
  /**
   * createPatient inserta un nuevo paciente y retorna la fila creada.
   * Requiere que las políticas RLS permitan insert con el anon key para la tabla patients.
   */
  async createPatient(patientData) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(patientData)
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Error creating patient:', data);
        throw new Error(data.message || 'Error al crear el paciente');
      }
      return data[0];
    } catch (err) {
      console.error('Error in createPatient:', err);
      throw err;
    }
  }
};

export default supabaseRest;
