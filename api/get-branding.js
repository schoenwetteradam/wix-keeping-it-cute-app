// api/get-branding.js - Get salon branding info
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    console.log('🎨 Fetching salon branding...')

    // Get branding info
    const { data: branding, error } = await supabase
      .from('salon_branding')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Branding fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch branding',
        details: error.message
      })
    }

    // If no branding found, return defaults
    const defaultBranding = {
      logo_url: '/images/logo/salon-logo.png',
      primary_color: '#ff9a9e',
      secondary_color: '#fecfef',
      salon_name: 'Keeping It Cute Salon & Spa',
      address: '144 E Oak St, Juneau, WI',
      phone: null,
      email: null,
      website: null
    }

    res.status(200).json({
      success: true,
      branding: branding || defaultBranding,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    console.error('❌ Branding Error:', err)
    res.status(500).json({
      error: 'Unexpected error',
      details: err.message,
      timestamp: new Date().toISOString()
    })
  }
}
