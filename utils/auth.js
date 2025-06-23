import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return { user: null, error: new Error('Missing token') }
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { user: null, error: error || new Error('Invalid session') }
  }

  return { user: data.user, error: null }
}

export async function requireAuth(req, res) {
  const { user, error } = await getUserFromRequest(req)
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return user
}
