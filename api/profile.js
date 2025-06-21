// api/profile.js - return user profile with role
import { verifyUser } from '../utils/verifyUser.js'
import serverClient from '../utils/verifyUser.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { user, error } = await verifyUser(req)
  if (error) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data, error: profileError } = await serverClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return res.status(500).json({ error: 'Failed to fetch profile', details: profileError.message })
  }

  res.status(200).json({ user: { id: user.id, email: user.email }, role: data.role })
}
