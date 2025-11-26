const { createClient } = require('@supabase/supabase-js');

let supabase = null;
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

const ALLOWED_STAFF_DOMAINS = (process.env.ALLOWED_STAFF_DOMAINS || 'keepingitcute.com,wix.com')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

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
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return null;
  }

  const userEmail = data.user.email?.toLowerCase() || '';
  const domain = userEmail.split('@')[1];
  if (!domain || !ALLOWED_STAFF_DOMAINS.includes(domain)) {
    res.statusCode = 403;
    res.end('Staff access required');
    return null;
  }

  let role = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    role = profile?.role || null;
  } catch (e) {
    role = null;
  }

  const normalizedRole = role?.toLowerCase();
  const isStaff = normalizedRole === 'staff' || normalizedRole === 'admin';

  if (!isStaff) {
    res.statusCode = 403;
    res.end('Staff access required');
    return null;
  }

  req.user = { ...data.user, role: normalizedRole };
  return req.user;
}

module.exports = requireAuth;
