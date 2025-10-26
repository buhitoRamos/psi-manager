const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'change-me-in-prod';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Important: service role key must be set for server-side DB queries that require elevated privileges
  // We only warn here to allow local testing, but you should set env vars before deploying.
  // eslint-disable-next-line no-console
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Server will not be able to query DB.');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

const app = express();
app.use(cors());
app.use(express.json());

// POST /api/login
// Body: { user, pass }
app.post('/api/login', async (req, res) => {
  const { user, pass } = req.body || {};
  if (!user || !pass) return res.status(400).json({ error: 'Missing user or pass' });

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, user, pass')
      .eq('user', user)
      .limit(1)
      .single();

    if (error) {
      return res.status(401).json({ error: error.message || 'Usuario no encontrado' });
    }

    if (!data) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const stored = data.pass || '';
    let ok = false;

    // If stored looks like a bcrypt hash, compare with bcrypt
    if (/^\$2[aby]\$/.test(stored)) {
      ok = await bcrypt.compare(pass, stored);
    } else {
      // fallback to plaintext comparison (for legacy/testing only)
      ok = stored === pass;
    }

    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ sub: data.id, user: data.user }, JWT_SECRET, { expiresIn: '1h' });

    return res.json({ token, user: { id: data.id, user: data.user } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Login error', err);
    return res.status(500).json({ error: 'Error interno' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth server listening on port ${PORT}`);
});
