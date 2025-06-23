// api/fix-get-branding.js - Fixed version that handles multiple records
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    console.log('🎨 Fetching salon branding (FIXED VERSION)...')

    // Get all branding records and pick the best one
    const { data: brandingRecords, error } = await supabase
      .from('salon_branding')
      .select('*')
      .order('id', { ascending: true }) // Get oldest first (most likely to be correct)

    if (error) {
      console.error('❌ Branding fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch branding',
        details: error.message
      })
    }

    console.log(`📊 Found ${brandingRecords?.length || 0} branding records`)

    let branding = null

    if (brandingRecords && brandingRecords.length > 0) {
      // Prefer record with logo_url, otherwise use first record
      branding = brandingRecords.find(record => record.logo_url) || brandingRecords[0]
      
      console.log(`✅ Using branding record ID: ${branding.id}`)
      console.log(`🖼️ Logo URL: ${branding.logo_url}`)

      // If we have duplicates, log a warning
      if (brandingRecords.length > 1) {
        console.log(`⚠️ WARNING: Found ${brandingRecords.length} branding records - should only have 1`)
        console.log('📝 Consider cleaning up duplicate records in database')
      }
    }

    // If no branding found, return defaults
    const defaultBranding = {
      id: null,
      logo_url: '/images/logo/salon-logo.png',
      primary_color: '#ff9a9e',
      secondary_color: '#fecfef',
      salon_name: 'Keeping It Cute Salon & Spa',
      address: '144 E Oak St, Juneau, WI',
      phone: null,
      email: null,
      website: null
    }

    const finalBranding = branding || defaultBranding

    res.status(200).json({
      success: true,
      branding: finalBranding,
      debug: {
        records_found: brandingRecords?.length || 0,
        using_defaults: !branding,
        duplicate_warning: brandingRecords?.length > 1
      },
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
