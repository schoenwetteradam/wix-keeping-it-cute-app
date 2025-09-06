// api/appointments.js - Get appointments with filtering
import { createSupabaseClient } from '../utils/supabaseClient'
import { withErrorHandler, APIError } from '../utils/errorHandler'

const supabase = createSupabaseClient()

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const {
    date,
    status,
    payment_status,
    staff_id,
    customer_id,
    limit = '50'
  } = req.query

  let query = supabase
    .from('salon_appointments')
    .select(`
        *,
        customers(*),
        salon_services(*),
        staff(*)
      `)
    .order('appointment_date', { ascending: false })
    .limit(parseInt(limit))

  if (date) {
    query = query
      .gte('appointment_date', `${date}T00:00:00`)
      .lt('appointment_date', `${date}T23:59:59`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (payment_status) {
    query = query.eq('payment_status', payment_status)
  }

  if (staff_id) {
    query = query.eq('staff_id', staff_id)
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }

  const { data: appointments, error } = await query

  if (error) {
    throw new APIError('Failed to fetch appointments', 500, 'DATABASE_ERROR')
  }

  res.status(200).json({
    success: true,
    appointments,
    count: appointments.length,
    timestamp: new Date().toISOString()
  })
}

export default withErrorHandler(handler)
