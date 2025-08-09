const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function requireAuth(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return null;
  }
  const tokenMatch = authHeader.match(/^Bearer\s+(.*)$/);
  if (!tokenMatch) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return null;
  }
  const token = tokenMatch[1];
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return null;
  }
  let role = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    role = profile?.role || null;
  } catch (e) {
    role = null;
  }
  req.user = { ...data.user, role };
  return req.user;
}

module.exports = requireAuth;
