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
  api: { bodyParser: false }
}

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const bucket = process.env.SUPABASE_CLIENT_UPLOADS_BUCKET || 'client-uploads'

    const form = formidable({ maxFileSize: 20 * 1024 * 1024, multiples: false })

    const parse = () =>
      new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err)
          resolve({ fields, files })
        })
      })

    const { fields, files } = await parse()

    const fileField = files.file || files.image || files.photo
    if (!fileField) {
      return res.status(400).json({ success: false, error: 'No file provided' })
    }
    const file = Array.isArray(fileField) ? fileField[0] : fileField

    const bookingId = Array.isArray(fields.booking_id)
      ? fields.booking_id[0]
      : fields.booking_id

    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'booking_id required' })
    }

    const ext = path.extname(file.originalFilename || '') || '.dat'
    const filename = `booking-${bookingId}-${Date.now()}${ext}`
    const storagePath = `booking-files/${bookingId}/${filename}`
    const buffer = fs.readFileSync(file.filepath)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: file.mimetype })
    fs.unlinkSync(file.filepath)

    if (uploadError) {
      console.error(uploadError)
      return res.status(500).json({ success: false, error: 'Upload failed' })
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    const fileUrl = publicData.publicUrl

    await supabase.from('booking_images').insert({
      booking_id: bookingId,
      file_url: fileUrl,
      file_name: filename,
      file_type: file.mimetype
    })

    res.status(200).json({ success: true, file_url: fileUrl, file_name: filename })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
}
