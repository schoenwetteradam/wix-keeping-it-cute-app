// api/upload-salon-logo.js - Complete logo upload system
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

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
  setCorsHeaders(res, 'POST')
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
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'salon-images'

    // Configure formidable for logo uploads
    const form = formidable({
      uploadDir: undefined,
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
    const originalExt = path.extname(file.originalFilename || '').toLowerCase()
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(originalExt) ? originalExt : '.png'

    // Always use a consistent filename for the main logo
    const logoFilename = `salon-logo${safeExt}`
    const supabasePath = `logo/${logoFilename}`

    const fileBuffer = fs.readFileSync(file.filepath)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(supabasePath, fileBuffer, { contentType: file.mimetype, upsert: true })

    fs.unlinkSync(file.filepath)

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return res.status(500).json({ success: false, error: 'Failed to upload logo' })
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(supabasePath)
    const logoUrl = publicData.publicUrl
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
