// api/staff-chat.js - Staff chat messages API
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, ['GET', 'POST'])

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'GET') {
    try {
      const { data: messages, error } = await supabase
        .from('staff_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        console.error('❌ Chat fetch error:', error)
        return res.status(500).json({ error: 'Failed to fetch messages', details: error.message })
      }

      return res.status(200).json({ messages: messages || [] })
    } catch (err) {
      console.error('❌ Chat fetch exception:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { content, username } = req.body || {}
      if (!content) {
        return res.status(400).json({ error: 'Message content required' })
      }

      const { data, error } = await supabase
        .from('staff_chat_messages')
        .insert({ content, username })
        .select()
        .single()

      if (error) {
        console.error('❌ Chat insert error:', error)
        return res.status(500).json({ error: 'Failed to send message', details: error.message })
      }

      return res.status(200).json({ message: data })
    } catch (err) {
      console.error('❌ Chat insert exception:', err)
      return res.status(500).json({ error: 'Unexpected error', details: err.message })
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' })
}
