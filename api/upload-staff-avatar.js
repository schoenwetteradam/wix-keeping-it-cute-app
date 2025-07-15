import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

export const config = {
  api: { bodyParser: false }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const user = await requireAuth(req, res)
  if (!user) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024, keepExtensions: true })
  const data = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  }).catch(() => null)

  if (!data) {
    return res.status(400).json({ error: 'Invalid form data' })
  }

  const file = data.files.avatar || data.files.file || data.files.image
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'salon-images'
  const ext = path.extname(file.originalFilename || '.jpg').toLowerCase()
  const filePath = `avatars/${user.id}${ext}`
  const buffer = fs.readFileSync(file.filepath)
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType: file.mimetype, upsert: true })
  fs.unlinkSync(file.filepath)
  if (uploadError) {
    return res.status(500).json({ error: 'Failed to upload avatar' })
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath)
  const avatarUrl = publicData.publicUrl

  const { data: profile, error } = await supabase
    .from('staff_profiles')
    .upsert({ id: user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single()
  if (error) {
    return res.status(500).json({ error: 'Failed to save profile' })
  }

  res.status(200).json({ profile })
}
