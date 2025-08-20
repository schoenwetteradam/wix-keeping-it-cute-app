import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Verify authentication
    const user = await requireAuth(req, res)
    if (!user) return

    console.log('👤 Checking staff records for user:', user.id, user.email)
    
    const userEmail = user.email || 'staff@example.com'

    // Find all possible staff records for this user
    const checks = [
      {
        name: 'Exact ID match',
        query: supabase.from('staff').select('*').eq('id', user.id)
      },
      {
        name: 'Email match',
        query: supabase.from('staff').select('*').eq('email', userEmail)
      },
      {
        name: 'Email starts with username',
        query: supabase.from('staff').select('*').ilike('email', `${userEmail.split('@')[0]}%`)
      }
    ]

    const results = {}
    
    for (const check of checks) {
      try {
        const { data, error } = await check.query
        results[check.name] = {
          success: !error,
          data: data || [],
          error: error?.message || null
        }
      } catch (err) {
        results[check.name] = {
          success: false,
          data: [],
          error: err.message
        }
      }
    }

    // Find the best staff record to use
    let bestStaff = null
    
    // Priority 1: Exact ID match
    if (results['Exact ID match'].data.length > 0) {
      bestStaff = results['Exact ID match'].data[0]
    }
    // Priority 2: Email match
    else if (results['Email match'].data.length > 0) {
      bestStaff = results['Email match'].data[0]
    }
    // Priority 3: Username match
    else if (results['Email starts with username'].data.length > 0) {
      bestStaff = results['Email starts with username'].data[0]
    }

    res.status(200).json({
      success: true,
      message: 'Staff record check completed',
      authUser: {
        id: user.id,
        email: user.email
      },
      searchResults: results,
      recommendedStaff: bestStaff,
      canCreateAppointments: !!bestStaff
    })

  } catch (err) {
    console.error('❌ Staff check error:', err)
    res.status(500).json({ 
      error: 'Failed to check staff records', 
      details: err.message 
    })
  }
}

