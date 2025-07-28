import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST'])

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to load profile', details: error.message })
    }

    const isAdmin = ADMIN_IDS.includes(user.id)
    res.status(200).json({ profile: { email: user.email, is_admin: isAdmin, ...(data || {}) } })
    return
  }

  if (req.method === 'POST') {
    const { full_name, phone, address, gender } = req.body || {}
    const { data, error } = await supabase
      .from('staff_profiles')
      .upsert({ id: user.id, full_name, phone, address, gender, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to save profile', details: error.message })
    }

    res.status(200).json({ profile: data })
    return
  }

  res.status(405).json({ error: 'Method Not Allowed' })
}
