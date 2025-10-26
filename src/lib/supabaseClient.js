import { createClient } from '@supabase/supabase-js';

// Defaults (can be overridden by REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY)
const DEFAULT_SUPABASE_URL = 'https://ljynujodigqqujjvyoud.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeW51am9kaWdxcXVqanZ5b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTY4NTAsImV4cCI6MjA3Njk5Mjg1MH0.oCSsBjWbZl7w81E67H3VV3in7gX5tJAVPWZM2EG9UEo';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase URL or ANON key not found in environment variables and no default provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
