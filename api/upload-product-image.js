// api/upload-product-image.js - Single product image upload
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📸 Processing image upload...')
    
    // Ensure upload directory exists
    const baseUploadDir = './public/images/products'
    if (!fs.existsSync(baseUploadDir)) {
      fs.mkdirSync(baseUploadDir, { recursive: true })
      console.log('Created upload directory:', baseUploadDir)
    }

    const form = formidable({
      uploadDir: baseUploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ name, originalFilename, mimetype }) => {
        console.log('File filter check:', { name, originalFilename, mimetype })
        return mimetype && mimetype.includes('image')
      }
    })

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ Upload parsing error:', err)
        return res.status(500).json({ error: 'Upload parsing failed: ' + err.message })
      }

      console.log('📋 Form fields:', fields)
      console.log('📁 Form files:', Object.keys(files))

      const file = files.image || files.file
      if (!file) {
        return res.status(400).json({ error: 'No image file provided' })
      }

      // Extract form data
      const productId = Array.isArray(fields.product_id) ? fields.product_id[0] : fields.product_id
      const category = Array.isArray(fields.category) ? fields.category[0] : (fields.category || 'other')
      
      console.log('📦 Product ID:', productId)
      console.log('🏷️ Category:', category)
      
      // Create category directory if it doesn't exist
      const categoryDir = path.join(baseUploadDir, category.toLowerCase())
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true })
        console.log('Created category directory:', categoryDir)
      }

      // Generate unique filename
      const timestamp = Date.now()
      const originalName = file.originalFilename || 'image'
      const ext = path.extname(originalName).toLowerCase() || '.jpg'
      const baseName = productId ? `product-${productId}` : `upload-${timestamp}`
      const newFilename = `${baseName}-${timestamp}${ext}`
      const finalPath = path.join(categoryDir, newFilename)

      console.log('📁 Moving file from:', file.filepath)
      console.log('📁 Moving file to:', finalPath)

      // Move file to final location
      try {
        fs.renameSync(file.filepath, finalPath)
        console.log('✅ File moved successfully')
      } catch (moveError) {
        console.error('❌ File move error:', moveError)
        return res.status(500).json({ error: 'Failed to save file: ' + moveError.message })
      }

      // Construct public URL
      const imageUrl = `/images/products/${category.toLowerCase()}/${newFilename}`
      console.log('🔗 Image URL:', imageUrl)

      // Update product in database if product_id provided
      if (productId) {
        console.log('💾 Updating product in database...')
        
        const { data: updatedProduct, error: updateError } = await supabase
          .from('products')
          .update({ 
            image_url: imageUrl,
            image_uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Database update error:', updateError)
          return res.status(500).json({ 
            error: 'Image uploaded but database update failed',
            details: updateError.message,
            image_url: imageUrl 
          })
        }

        console.log('✅ Product updated in database:', updatedProduct.product_name)
      }

      // Success response
      const response = {
        success: true,
        image_url: imageUrl,
        filename: newFilename,
        category: category,
        file_size: file.size,
        original_name: originalName,
        message: 'Image uploaded successfully'
      }

      console.log('🎉 Upload completed successfully')
      res.status(200).json(response)
    })

  } catch (error) {
    console.error('❌ Upload handler error:', error)
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    })
  }
}
