import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Service ID is required' })
    }

    const { data: service, error } = await supabase
      .from('salon_services')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Service fetch error:', error)
      return res.status(500).json({
        error: 'Failed to fetch service',
        details: error.message
      })
    }

    if (!service) {
      return res.status(404).json({ error: 'Service not found' })
    }

    // Fetch related staff members
    const { data: staffLinks } = await supabase
      .from('service_staff')
      .select('staff:staff(*)')
      .eq('service_id', id)

    // Fetch resources linked to the service
    const { data: resourceRows } = await supabase
      .from('service_resources')
      .select('resource_name')
      .eq('service_id', id)

    // Fetch related products
    const { data: productLinks } = await supabase
      .from('service_products')
      .select('product:products(*)')
      .eq('service_id', id)

    service.staff = staffLinks?.map((r) => r.staff) || []
    service.resources = resourceRows?.map((r) => r.resource_name) || []
    service.products = productLinks?.map((r) => r.product) || []

    res.status(200).json({
      success: true,
      service,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('❌ Get Service Error:', err)
    res.status(500).json({
      error: 'Unexpected error',
      details: err.message
    })
  }
}
