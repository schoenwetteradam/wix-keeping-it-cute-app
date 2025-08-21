import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET,POST')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  try {
    switch (action) {
      case 'check-availability-enhanced':
        return await checkAvailabilityEnhanced(req, res)
      case 'get-analytics':
        return await forwardToEdgeFunction(req, res, 'analytics')
      case 'bulk-operations':
        return await forwardToEdgeFunction(req, res, 'bulk-operations')
      default:
        return await forwardToEdgeFunction(req, res)
    }
  } catch (error) {
    console.error('Enhanced booking operations error:', error)
    res.status(500).json({ error: error.message })
  }
}

async function forwardToEdgeFunction(req, res, specificAction) {
  const params = new URLSearchParams(req.query)
  if (specificAction) {
    params.set('action', specificAction)
  }

  const edgeFunctionUrl = `${process.env.SUPABASE_URL}/functions/v1/booking-operations`
  const response = await fetch(`${edgeFunctionUrl}?${params.toString()}`, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
  })

  const data = await response.json()
  return res.status(response.status).json(data)
}

async function checkAvailabilityEnhanced(req, res) {
  const { date, staff_id, duration = 60, include_buffer = 'true' } = req.query

  const bufferMinutes = include_buffer === 'true' ? 15 : 0

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('appointment_date, end_time, staff_id, service_duration')
    .gte('appointment_date', `${date}T00:00:00.000Z`)
    .lte('appointment_date', `${date}T23:59:59.999Z`)
    .neq('status', 'cancelled')

  if (error) throw error

  const slots = generateSlotsWithBuffer(
    date,
    parseInt(duration),
    bufferMinutes,
    bookings || [],
    staff_id
  )

  res.status(200).json({
    success: true,
    date,
    duration: parseInt(duration),
    buffer_minutes: bufferMinutes,
    slots,
    enhanced: true,
  })
}

function generateSlotsWithBuffer(date, duration, bufferMinutes, bookings, staffId) {
  // Placeholder implementation: return empty array when no logic is defined
  // In a real scenario, integrate with existing scheduling utilities
  return []
}
