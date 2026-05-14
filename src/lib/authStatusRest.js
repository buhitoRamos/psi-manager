// Consulta el estado de autenticación de un usuario usando RPC (bypassea RLS)
// Devuelve el registro o null si no existe
export async function getAuthStatusByUserId(user_id) {
  const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || 'https://ljynujodigqqujjvyoud.supabase.co').replace(/\/+$/,'');
  const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeW51am9kaWdxcXVqanZ5b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTY4NTAsImV4cCI6MjA3Njk5Mjg1MH0.oCSsBjWbZl7w81E67H3VV3in7gX5tJAVPWZM2EG9UEo';
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  // Intentar primero con RPC (bypassea RLS)
  try {
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_auth_status`;
    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id_param: Number(user_id) })
    });
    if (rpcRes.ok) {
      const rpcJson = await rpcRes.json();
      // RPC puede devolver un array o un objeto
      const result = Array.isArray(rpcJson) ? rpcJson[0] : rpcJson;
      if (result && result.id !== undefined) {
        return result;
      }
    }
  } catch (rpcErr) {
    console.warn('[authStatusRest] RPC get_auth_status failed, falling back to REST:', rpcErr);
  }

  // Fallback: consulta directa REST (puede fallar por RLS)
  const path = `/rest/v1/auth_status?select=id,user_id,status&user_id=eq.${encodeURIComponent(user_id)}`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) throw new Error(`Supabase GET ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json) && json.length > 0 ? json[0] : null;
}

// Actualiza o crea el estado de un usuario usando RPC (bypassea RLS)
export async function updateAuthStatus(user_id, status) {
  const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || 'https://ljynujodigqqujjvyoud.supabase.co').replace(/\/+$/,'');
  const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeW51am9kaWdxcXVqanZ5b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTY4NTAsImV4cCI6MjA3Njk5Mjg1MH0.oCSsBjWbZl7w81E67H3VV3in7gX5tJAVPWZM2EG9UEo';
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  // Intentar primero con RPC set_auth_status (bypassea RLS)
  try {
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/set_auth_status`;
    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id_param: Number(user_id), status_param: status })
    });
    if (rpcRes.ok) {
      const rpcJson = await rpcRes.json();
      const result = Array.isArray(rpcJson) ? rpcJson[0] : rpcJson;
      if (result && result.id !== undefined) {
        return result;
      }
    }
  } catch (rpcErr) {
    console.warn('[authStatusRest] RPC set_auth_status failed, falling back to REST:', rpcErr);
  }

  // Fallback: PATCH directo via REST
  const path = `/rest/v1/auth_status?user_id=eq.${encodeURIComponent(user_id)}`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json) && json.length > 0 ? json[0] : json;
}

// Crea un registro en auth_status usando RPC (bypassea RLS)
export async function insertAuthStatus(user_id, status) {
  const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || 'https://ljynujodigqqujjvyoud.supabase.co').replace(/\/+$/,'');
  const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeW51am9kaWdxcXVqanZ5b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTY4NTAsImV4cCI6MjA3Njk5Mjg1MH0.oCSsBjWbZl7w81E67H3VV3in7gX5tJAVPWZM2EG9UEo';
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  // Intentar primero con RPC set_auth_status (hace upsert, bypassea RLS)
  try {
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/set_auth_status`;
    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id_param: Number(user_id), status_param: status })
    });
    if (rpcRes.ok) {
      const rpcJson = await rpcRes.json();
      const result = Array.isArray(rpcJson) ? rpcJson[0] : rpcJson;
      if (result && result.id !== undefined) {
        return result;
      }
    }
  } catch (rpcErr) {
    console.warn('[authStatusRest] RPC set_auth_status failed, falling back to REST:', rpcErr);
  }

  // Fallback: POST directo via REST
  const path = `/rest/v1/auth_status`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ user_id, status })
  });
  if (!res.ok) throw new Error(`Supabase POST ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json) && json.length > 0 ? json[0] : json;
}

// Verifica si un usuario puede acceder (status = true o no tiene registro)
// Usa RPC can_user_access que bypassea RLS
export async function canUserAccess(user_id) {
  const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || 'https://ljynujodigqqujjvyoud.supabase.co').replace(/\/+$/,'');
  const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeW51am9kaWdxcXVqanZ5b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTY4NTAsImV4cCI6MjA3Njk5Mjg1MH0.oCSsBjWbZl7w81E67H3VV3in7gX5tJAVPWZM2EG9UEo';
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  try {
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/can_user_access`;
    const rpcRes = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id_param: Number(user_id) })
    });
    if (rpcRes.ok) {
      const rpcJson = await rpcRes.json();
      // RPC devuelve { can_access: true/false } o array con ese objeto
      const result = Array.isArray(rpcJson) ? rpcJson[0] : rpcJson;
      if (result && result.can_access !== undefined) {
        return result.can_access;
      }
    }
  } catch (rpcErr) {
    console.warn('[authStatusRest] RPC can_user_access failed:', rpcErr);
  }

  // Fallback: usar getAuthStatusByUserId
  const authStatus = await getAuthStatusByUserId(user_id);
  if (authStatus && authStatus.status === false) return false;
  return true;
}
