const { createSupabaseClient } = require('../utils/supabaseClient');

describe('Supabase client initialization', () => {
  it('initializes when environment variables are set', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    const client = createSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client).toBe('object');
  });
});
