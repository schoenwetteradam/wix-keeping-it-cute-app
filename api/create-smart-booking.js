import { createSupabaseClient } from '../utils/supabaseClient'
import { withErrorHandler, APIError } from '../utils/errorHandler'

const supabase = createSupabaseClient()

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const {
    wix_booking_id,
    customer_email,
    customer_name,
    customer_phone,
    service_name,
    staff_member,
    appointment_date,
    end_time,
    notes,
    ...rest
  } = req.body

  if (!customer_email && !customer_name) {
    throw new APIError('Customer email or name is required', 400, 'VALIDATION_ERROR')
  }

  if (!service_name) {
    throw new APIError('Service name is required', 400, 'VALIDATION_ERROR')
  }

  if (!appointment_date) {
    throw new APIError('Appointment date is required', 400, 'VALIDATION_ERROR')
  }

  try {
    const { data, error } = await supabase
      .rpc('create_smart_booking', {
        p_wix_booking_id: wix_booking_id,
        p_customer_email: customer_email,
        p_customer_name: customer_name,
        p_customer_phone: customer_phone,
        p_service_name: service_name,
        p_staff_name: staff_member,
        p_appointment_date: appointment_date,
        p_end_time: end_time,
        p_notes: notes,
        p_payload: rest
      })

    if (error) {
      throw new APIError('Failed to create booking', 500, 'DATABASE_ERROR')
    }

    const result = data[0]

    if (!result.success) {
      throw new APIError(result.message, 400, 'BOOKING_CREATION_FAILED')
    }

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        customers(first_name, last_name, email, phone),
        salon_services(name, price, duration_minutes),
        staff_profiles(full_name),
        orders(total_amount, payment_status)
      `)
      .eq('id', result.booking_id)
      .single()

    if (fetchError) {
      console.warn('Could not fetch complete booking details:', fetchError)
    }

    res.status(201).json({
      success: true,
      booking: booking || {
        id: result.booking_id,
        customer_id: result.customer_id,
        service_id: result.service_id,
        staff_id: result.staff_id,
        total_price: result.total_price,
        service_duration: result.service_duration
      },
      message: result.message,
      linked_data: {
        customer_linked: !!result.customer_id,
        service_linked: !!result.service_id,
        staff_linked: !!result.staff_id,
        price_calculated: result.total_price > 0
      }
    })
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    throw new APIError('Unexpected error creating booking', 500, 'INTERNAL_ERROR')
  }
}

export default withErrorHandler(handler)
