// api/upload-image.js - Simple image upload handler
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'products')

    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024,
    })

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err)
        return res.status(500).json({ error: 'Upload failed' })
      }

      const file = files.image
      if (!file) {
        return res.status(400).json({ error: 'No image file provided' })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const ext = path.extname(file.originalFilename || '.jpg')
      const newFilename = `product-${timestamp}${ext}`
      const newPath = path.join(uploadDir, newFilename)

      // Move file to final location
      fs.renameSync(file.filepath, newPath)

      const imageUrl = `/images/products/${newFilename}`

      // If product_id provided, update the product
      if (fields.product_id) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', fields.product_id)

        if (updateError) {
          console.error('Database update error:', updateError)
        }
      }

      res.status(200).json({
        success: true,
        image_url: imageUrl,
        filename: newFilename,
        message: 'Image uploaded successfully'
      })
    })

  } catch (error) {
    console.error('Upload handler error:', error)
    res.status(500).json({
      error: 'Failed to upload image',
      details: error.message
    })
  }
}
