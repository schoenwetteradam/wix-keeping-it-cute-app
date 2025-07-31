const { createClient } = require('@supabase/supabase-js');

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or Supabase key');
  }
  return createClient(url, key);
}

module.exports = { createSupabaseClient };
