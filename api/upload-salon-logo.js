// api/upload-salon-logo.js - Complete logo upload system
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Use POST.' 
    })
  }

  console.log('🎨 === SALON LOGO UPLOAD START ===')

  try {
    // Ensure logo directory exists
    const logoDir = path.join(process.cwd(), 'public', 'images', 'logo')
    if (!fs.existsSync(logoDir)) {
      fs.mkdirSync(logoDir, { recursive: true })
      console.log('✅ Created logo directory')
    }

    // Configure formidable for logo uploads
    const form = formidable({
      uploadDir: logoDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit for logos
      maxFiles: 1,
      allowEmptyFiles: false,
      filter: function ({ name, originalFilename, mimetype }) {
        console.log('🔍 Logo file check:', { name, originalFilename, mimetype })
        
        // Check if it's an image
        const isImage = mimetype && mimetype.startsWith('image/')
        if (!isImage) {
          console.log('❌ Not an image file:', mimetype)
        }
        return isImage
      }
    })

    // Parse the form
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error('❌ Form parsing error:', err)
            reject(err)
            return
          }
          resolve({ fields, files })
        })
      })
    }

    const { fields, files } = await parseForm()
    
    console.log('📋 Parsed fields:', Object.keys(fields))
    console.log('📁 Parsed files:', Object.keys(files))

    // Extract the uploaded file
    const file = files.logo || files.image || files.file || files[Object.keys(files)[0]]
    
    if (!file) {
      console.log('❌ No logo file found in upload')
      return res.status(400).json({ 
        success: false,
        error: 'No logo file found in upload. Please select an image file.' 
      })
    }

    console.log('🎨 Logo file details:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath
    })

    // Validate file type more strictly for logos
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!validImageTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Please upload a JPG, PNG, WebP, or SVG image.'
      })
    }

    // Generate filename for the logo
    const timestamp = Date.now()
    const originalExt = path.extname(file.originalFilename || '').toLowerCase()
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(originalExt) ? originalExt : '.png'
    
    // Always use a consistent filename for the main logo
    const logoFilename = `salon-logo${safeExt}`
    const finalPath = path.join(logoDir, logoFilename)

    // Backup existing logo if it exists
    if (fs.existsSync(finalPath)) {
      const backupPath = path.join(logoDir, `salon-logo-backup-${timestamp}${safeExt}`)
      fs.copyFileSync(finalPath, backupPath)
      console.log('💾 Backed up existing logo')
    }

    console.log('📁 Moving logo to:', finalPath)

    // Move file to final location
    try {
      if (!fs.existsSync(file.filepath)) {
        throw new Error('Temporary file not found')
      }

      fs.renameSync(file.filepath, finalPath)
      console.log('✅ Logo file moved successfully')

      // Verify file was moved correctly
      if (!fs.existsSync(finalPath)) {
        throw new Error('Logo was not saved correctly')
      }

      const stats = fs.statSync(finalPath)
      console.log('📊 Final logo size:', stats.size, 'bytes')

    } catch (moveError) {
      console.error('❌ Logo move error:', moveError)
      
      // Clean up temporary file if it exists
      try {
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath)
        }
      } catch (cleanupError) {
        console.error('⚠️ Cleanup error:', cleanupError)
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'Failed to save logo: ' + moveError.message 
      })
    }

    // Construct public URL
    const logoUrl = `/images/logo/${logoFilename}`
    console.log('🔗 Public logo URL:', logoUrl)

    // Update database with new logo URL
    try {
      console.log('💾 Updating database with new logo...')
      
      // Check if branding record exists
      const { data: existingBranding } = await supabase
        .from('salon_branding')
        .select('id')
        .single()

      const brandingData = {
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      }

      if (existingBranding) {
        // Update existing record
        const { data, error: updateError } = await supabase
          .from('salon_branding')
          .update(brandingData)
          .eq('id', existingBranding.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Database update error:', updateError)
        } else {
          console.log('✅ Database updated successfully')
        }
      } else {
        // Insert new record with defaults
        const { data, error: insertError } = await supabase
          .from('salon_branding')
          .insert([{
            ...brandingData,
            salon_name: 'Keeping It Cute Salon & Spa',
            primary_color: '#ff9a9e',
            secondary_color: '#fecfef',
            address: '144 E Oak St, Juneau, WI'
          }])
          .select()
          .single()

        if (insertError) {
          console.error('❌ Database insert error:', insertError)
        } else {
          console.log('✅ Database record created successfully')
        }
      }
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError)
      // Continue anyway - logo file is uploaded successfully
    }

    // Log successful upload
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'salon_logo_uploaded',
        metric_data: {
          filename: logoFilename,
          file_size: file.size,
          file_type: file.mimetype,
          upload_timestamp: new Date().toISOString()
        }
      })

    // Success response
    const response = {
      success: true,
      message: 'Salon logo uploaded successfully',
      logo_url: logoUrl,
      filename: logoFilename,
      file_size: file.size,
      file_type: file.mimetype,
      original_name: file.originalFilename,
      upload_timestamp: new Date().toISOString()
    }

    console.log('🎉 === LOGO UPLOAD SUCCESS ===')
    console.log('Response:', JSON.stringify(response, null, 2))
    res.status(200).json(response)

  } catch (error) {
    console.error('❌ === LOGO UPLOAD FAILED ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)

    // Always return JSON, never HTML
    res.status(500).json({
      success: false,
      error: 'Logo upload failed: ' + error.message,
      error_type: error.constructor.name,
      timestamp: new Date().toISOString()
    })
  }
}
