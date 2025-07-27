import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

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

  try {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'salon-images'
    const form = formidable({
      uploadDir: undefined,
      keepExtensions: true,
      maxFileSize: 2 * 1024 * 1024, // 2MB for favicons
      maxFiles: 1,
      allowEmptyFiles: false
    })

    const parseForm = () => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err)
          resolve({ fields, files })
        })
      })
    }

    const { files } = await parseForm()
    const file = files.favicon || files.file || files[Object.keys(files)[0]]

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No favicon file found in upload'
      })
    }

    const validTypes = [
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/png',
      'image/svg+xml'
    ]
    if (!validTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Please upload ICO, PNG, or SVG'
      })
    }

    const ext = path.extname(file.originalFilename || '').toLowerCase() || '.ico'
    const filename = `favicon${ext}`
    const supabasePath = `logo/${filename}`

    const fileBuffer = fs.readFileSync(file.filepath)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(supabasePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      })
    fs.unlinkSync(file.filepath)
    if (uploadError) {
      return res.status(500).json({ success: false, error: 'Failed to upload favicon' })
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(supabasePath)
    const faviconUrl = publicData.publicUrl

    try {
      const { data: existing } = await supabase
        .from('salon_branding')
        .select('id')
        .single()

      const brandingData = {
        favicon_url: faviconUrl,
        updated_at: new Date().toISOString()
      }

      if (existing) {
        await supabase.from('salon_branding').update(brandingData).eq('id', existing.id)
      } else {
        await supabase.from('salon_branding').insert([brandingData])
      }
    } catch (dbError) {
      // ignore db errors
    }

    res.status(200).json({ success: true, favicon_url: faviconUrl, message: 'Favicon uploaded successfully' })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Favicon upload failed: ' + err.message })
  }
}
