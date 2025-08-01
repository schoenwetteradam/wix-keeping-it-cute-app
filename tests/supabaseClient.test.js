const { createSupabaseClient } = require('../utils/supabaseClient');

describe('Supabase client initialization', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('initializes when server environment variables are set', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    const client = createSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client).toBe('object');
  });

  it('initializes when client environment variables are set', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const client = createSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client).toBe('object');
  });
});
