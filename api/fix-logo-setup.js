// api/fix-logo-setup.js - Run this ONCE to fix your logo setup
import fs from 'fs'
import path from 'path'
import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  try {
    console.log('🔧 Setting up salon logo system...')
    
    const results = {
      directories_created: [],
      files_moved: [],
      database_updated: false,
      errors: []
    }

    // 1. Create proper directory structure
    const directories = [
      'public/images',
      'public/images/logo',
      'public/images/branding',
      'public/images/products',
      'public/images/services'
    ]

    for (const dir of directories) {
      const fullPath = path.join(process.cwd(), dir)
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
        results.directories_created.push(dir)
        console.log(`✅ Created directory: ${dir}`)
      }
    }

    // 2. Check if salon-logo files exist in the wrong location and move them
    const wrongPngPath = path.join(process.cwd(), 'public/images/branding/salon-logo.png')
    const wrongSvgPath = path.join(process.cwd(), 'public/images/branding/salon-logo.svg')
    const correctPngPath = path.join(process.cwd(), 'public/images/logo/salon-logo.png')
    const correctSvgPath = path.join(process.cwd(), 'public/images/logo/salon-logo.svg')

    if (fs.existsSync(wrongPngPath) && !fs.existsSync(correctPngPath)) {
      fs.copyFileSync(wrongPngPath, correctPngPath)
      results.files_moved.push('salon-logo.png moved to correct location')
      console.log('✅ Moved salon-logo.png to correct location')
    }

    let logoExistsPng = fs.existsSync(correctPngPath)
    let logoExistsSvg = fs.existsSync(correctSvgPath)

    // 3. Create a fallback logo if none exists
    if (!logoExistsPng && !logoExistsSvg) {
      const fallbackSVG = `<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="white" stroke="#e0cdbb" stroke-width="2"/>
        <text x="100" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#e0cdbb">
          💅 Keeping It Cute
        </text>
        <text x="100" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">
          Salon & Spa
        </text>
        <text x="100" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">
          Juneau, WI
        </text>
      </svg>`

      fs.writeFileSync(correctSvgPath, fallbackSVG)
      results.files_moved.push('Created fallback SVG logo')
      console.log('✅ Created fallback SVG logo')
      logoExistsSvg = true
    }

    const finalLogoUrl = logoExistsPng ? '/images/logo/salon-logo.png' : '/images/logo/salon-logo.svg'

    // 4. Update/Insert correct branding info in database
    try {
      const brandingData = {
        logo_url: finalLogoUrl,
        primary_color: '#e0cdbb',
        secondary_color: '#eee4da',
        salon_name: 'Keeping It Cute Salon & Spa',
        address: '144 E Oak St, Juneau, WI',
        phone: null,
        email: null,
        website: null,
        updated_at: new Date().toISOString()
      }

      // Try to update existing record first
      const { data: existingBranding } = await supabase
        .from('salon_branding')
        .select('id')
        .single()

      if (existingBranding) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('salon_branding')
          .update(brandingData)
          .eq('id', existingBranding.id)
        
        if (updateError) throw updateError
        console.log('✅ Updated existing branding record')
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('salon_branding')
          .insert([brandingData])
        
        if (insertError) throw insertError
        console.log('✅ Inserted new branding record')
      }
      
      results.database_updated = true
      
    } catch (dbError) {
      console.error('⚠️ Database operation failed:', dbError.message)
      results.errors.push(`Database error: ${dbError.message}`)
      // Continue anyway - logo files are more important
    }

    // 5. Test that the logo is now accessible
    const logoExists = logoExistsPng || logoExistsSvg
    
    console.log('🎉 Logo setup complete!')
    
    res.status(200).json({
      success: true,
      message: 'Logo system setup complete!',
      results: results,
      logo_accessible: logoExists,
      logo_url: finalLogoUrl,
      next_steps: [
        '1. Refresh your staff portal page',
        '2. The logo should now appear in the header',
        '3. If using SVG fallback, replace with actual PNG logo',
        '4. Upload a custom logo via the upload system if desired'
      ],
      test_logo_url: `${req.headers.host}${finalLogoUrl}`
    })

  } catch (error) {
    console.error('❌ Logo setup failed:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}
