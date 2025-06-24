// api/upload-product-image.js - COMPLETELY FIXED VERSION
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// CRITICAL: Disable Next.js body parser for file uploads
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

  console.log('🔍 === UPLOAD REQUEST START ===')
  console.log('Content-Type:', req.headers['content-type'])
  console.log('Content-Length:', req.headers['content-length'])

  try {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'salon-images'

    // Configure formidable with enhanced error handling
    const form = formidable({
      uploadDir: undefined,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      maxFiles: 1,
      allowEmptyFiles: false,
      multiples: false,
      filter: function ({ name, originalFilename, mimetype }) {
        console.log('🔍 File filter check:', { name, originalFilename, mimetype })
        
        // Check if it's an image
        const isImage = mimetype && mimetype.startsWith('image/')
        if (!isImage) {
          console.log('❌ Not an image file:', mimetype)
        }
        return isImage
      }
    })

    // Parse the form with promise wrapper for better error handling
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error('❌ Form parsing error:', err)
            reject(err)
            return
          }
          console.log('✅ Form parsed successfully')
          resolve({ fields, files })
        })
      })
    }

    const { fields, files } = await parseForm()
    
    console.log('📋 Parsed fields:', Object.keys(fields))
    console.log('📁 Parsed files:', Object.keys(files))

    // Extract the uploaded file - handle both single file and array
    let file = null
    if (files.image) {
      file = Array.isArray(files.image) ? files.image[0] : files.image
    } else if (files.file) {
      file = Array.isArray(files.file) ? files.file[0] : files.file
    } else {
      // Get first file regardless of field name
      const fileKeys = Object.keys(files)
      if (fileKeys.length > 0) {
        const firstFile = files[fileKeys[0]]
        file = Array.isArray(firstFile) ? firstFile[0] : firstFile
      }
    }
    
    if (!file) {
      console.log('❌ No file found in upload')
      return res.status(400).json({ 
        success: false,
        error: 'No image file found in upload. Please select an image file.',
        debug: {
          fields: Object.keys(fields),
          files: Object.keys(files)
        }
      })
    }

    console.log('📸 File details:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath
    })

    // Extract form data safely
    const getFieldValue = (field) => {
      if (!field) return null
      return Array.isArray(field) ? field[0] : field
    }
    
    const productId = getFieldValue(fields.product_id)
    const category = getFieldValue(fields.category) || 'other'
    
    console.log('📦 Product ID:', productId)
    console.log('🏷️ Category:', category)
    
    // Validate required fields
    if (!productId) {
      console.log('❌ Missing product ID')
      return res.status(400).json({ 
        success: false,
        error: 'Product ID is required',
        debug: { fields: fields }
      })
    }

    // Generate safe, unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const originalExt = path.extname(file.originalFilename || '').toLowerCase()
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(originalExt) ? originalExt : '.jpg'

    const newFilename = `product-${productId}-${timestamp}-${randomSuffix}${safeExt}`

    const supabasePath = `products/${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${newFilename}`

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(file.filepath)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(supabasePath, fileBuffer, { contentType: file.mimetype })

    fs.unlinkSync(file.filepath)

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return res.status(500).json({ success: false, error: 'Failed to upload image' })
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(supabasePath)
    const imageUrl = publicData.publicUrl
    console.log('🔗 Public image URL:', imageUrl)

    // Update database
    let updatedProduct = null
    if (productId) {
      console.log('💾 Updating database...')
      
      try {
        const { data, error: updateError } = await supabase
          .from('products')
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)
          .select('id, product_name, brand, category')
          .single()

        if (updateError) {
          console.error('❌ Database update error:', updateError)
          // Don't fail the upload, just log the error
          console.log('⚠️ Image uploaded but database update failed')
        } else {
          updatedProduct = data
          console.log('✅ Database updated successfully:', data.product_name)
        }
      } catch (dbError) {
        console.error('❌ Database operation failed:', dbError)
        // Continue anyway - image is uploaded
      }
    }

    // Success response
    const response = {
      success: true,
      message: 'Image uploaded successfully',
      image_url: imageUrl,
      filename: newFilename,
      category: category,
      file_size: file.size,
      original_name: file.originalFilename,
      product_updated: !!updatedProduct,
      product_info: updatedProduct,
      upload_timestamp: new Date().toISOString()
    }

    console.log('🎉 === UPLOAD SUCCESS ===')
    console.log('Response:', JSON.stringify(response, null, 2))

    res.status(200).json(response)

  } catch (error) {
    console.error('❌ === UPLOAD FAILED ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Always return JSON, never HTML
    res.status(500).json({ 
      success: false,
      error: 'Upload failed: ' + error.message,
      error_type: error.constructor.name,
      timestamp: new Date().toISOString()
    })
  }
}
