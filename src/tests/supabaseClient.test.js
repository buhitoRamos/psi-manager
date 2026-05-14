import { supabase } from '../lib/supabaseClient';

describe('supabaseClient', () => {
  test('exports supabase client object', () => {
    expect(supabase).toBeDefined();
  });

  test('supabase client has createClient method', () => {
    expect(typeof supabase.from).toBe('function');
  });

  test('supabase client has auth method', () => {
    expect(supabase.auth).toBeDefined();
  });

  test('supabase client has channel method', () => {
    expect(typeof supabase.channel).toBe('function');
  });

  test('supabase client has removeChannel method', () => {
    expect(typeof supabase.removeChannel).toBe('function');
  });
});