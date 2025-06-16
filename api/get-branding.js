// api/get-branding.js - UPDATED VERSION (replace your existing file)
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

    // FIXED: Get branding records and handle duplicates properly
    const { data: brandingRecords, error } = await supabase
      .from('salon_branding')
      .select('*')
      .order('id', { ascending: true })

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Branding fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch branding',
        details: error.message
      })
    }

    let branding = null

    if (brandingRecords && brandingRecords.length > 0) {
      // FIXED: Prefer record with logo_url that's not null
      branding = brandingRecords.find(record => record.logo_url && record.logo_url !== null) || brandingRecords[0]
      
      console.log(`✅ Using branding record ID: ${branding.id}`)
      console.log(`🖼️ Logo URL: ${branding.logo_url}`)

      // Clean up duplicates automatically
      if (brandingRecords.length > 1) {
        console.log(`⚠️ Found ${brandingRecords.length} branding records - cleaning up...`)
        
        // Keep the best record, delete others
        const recordsToDelete = brandingRecords.filter(record => record.id !== branding.id)
        for (const record of recordsToDelete) {
          await supabase.from('salon_branding').delete().eq('id', record.id)
          console.log(`🗑️ Deleted duplicate record ID: ${record.id}`)
        }
      }
    }

    // If no branding found, create default record
    if (!branding) {
      console.log('📝 Creating default branding record...')
      
      const defaultBranding = {
        logo_url: '/images/logo/salon-logo.svg',
        primary_color: '#ff9a9e',
        secondary_color: '#fecfef',
        salon_name: 'Keeping It Cute Salon & Spa',
        address: '144 E Oak St, Juneau, WI',
        phone: null,
        email: null,
        website: null
      }

      const { data: newBranding, error: insertError } = await supabase
        .from('salon_branding')
        .insert([defaultBranding])
        .select()
        .single()

      if (insertError) {
        console.error('❌ Failed to create default branding:', insertError)
        branding = defaultBranding // Use defaults without database
      } else {
        branding = newBranding
        console.log('✅ Created default branding record')
      }
    }

    res.status(200).json({
      success: true,
      branding: branding,
      debug: {
        records_found: brandingRecords?.length || 0,
        logo_url: branding?.logo_url,
        cleaned_duplicates: brandingRecords?.length > 1
      },
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    console.error('❌ Branding Error:', err)
    
    // Return defaults if everything fails
    const fallbackBranding = {
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
      branding: fallbackBranding,
      debug: {
        error: err.message,
        using_fallback: true
      },
      timestamp: new Date().toISOString()
    })
  }
}
