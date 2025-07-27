import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'
import requireAuth from '../utils/requireAuth'

export const config = { api: { bodyParser: false } }

const supabase = createSupabaseClient()

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

  const form = formidable({ maxFileSize: 20 * 1024 * 1024, keepExtensions: true })
  const parseForm = () =>
    new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    })

  try {
    const { fields, files } = await parseForm()
    const fileField = files.receipt || files.file || files.image
    if (!fileField) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    const file = Array.isArray(fileField) ? fileField[0] : fileField

    const purchaseOrderId = Array.isArray(fields.purchase_order_id)
      ? fields.purchase_order_id[0]
      : fields.purchase_order_id

    if (!purchaseOrderId) {
      return res.status(400).json({ error: 'purchase_order_id required' })
    }

    const bucket = process.env.SUPABASE_RECEIPTS_BUCKET || 'product-usage-images'
    const ext = path.extname(file.originalFilename || '.jpg').toLowerCase()
    const filename = `receipt-${purchaseOrderId}-${Date.now()}${ext}`
    const storagePath = `purchase-receipts/${purchaseOrderId}/${filename}`
    const buffer = fs.readFileSync(file.filepath)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: file.mimetype })
    fs.unlinkSync(file.filepath)

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return res.status(500).json({ error: 'Failed to upload receipt' })
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    const fileUrl = publicData.publicUrl

    const { data, error } = await supabase
      .from('purchase_receipts')
      .insert({
        purchase_order_id: purchaseOrderId,
        receipt_url: fileUrl,
        file_name: filename,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('❌ DB insert error:', error)
      return res.status(500).json({ error: 'Failed to save receipt record' })
    }

    res.status(200).json({ receipt: data })
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    res.status(500).json({ error: 'Unexpected error', details: err.message })
  }
}
