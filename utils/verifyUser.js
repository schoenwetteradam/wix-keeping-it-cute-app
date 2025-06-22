import { createClient } from '@supabase/supabase-js'

const serverClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function verifyUser(req) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return { error: 'Missing token' }
  }
  const { data: { user }, error } = await serverClient.auth.getUser(token)
  if (error || !user) {
    return { error: error?.message || 'Unauthorized' }
  }
  return { user }
}

export default serverClient
