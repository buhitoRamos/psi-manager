// Consulta el estado de autenticación de un usuario en la tabla auth_status
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
  const path = `/rest/v1/auth_status?select=id,user_id,status&user_id=eq.${encodeURIComponent(user_id)}`;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) throw new Error(`Supabase GET ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json) && json.length > 0 ? json[0] : null;
}
