import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const bookingData = req.body;
    console.log('📅 Booking Created:', JSON.stringify(bookingData, null, 2));

    const bookingRecord = {
      wix_booking_id: bookingData.id || bookingData.bookingId,
      customer_email: bookingData.contactDetails?.email || bookingData.formInfo?.email,
      customer_name: `${bookingData.contactDetails?.firstName || ''} ${bookingData.contactDetails?.lastName || ''}`.trim(),
      customer_phone: bookingData.contactDetails?.phone,
      service_name: bookingData.service?.name || bookingData.serviceInfo?.name,
      service_duration: bookingData.service?.duration || bookingData.serviceInfo?.duration,
      appointment_date: bookingData.startDate || bookingData.start?.timestamp,
      total_price: bookingData.totalPrice || bookingData.payment?.finalPrice,
      staff_member: bookingData.staffMember?.name || bookingData.resource?.name,
      notes: bookingData.additionalFields?.notes || bookingData.formInfo?.additionalFields,
      status: 'scheduled',
      payload: bookingData
    };

    // Remove undefined values
    Object.keys(bookingRecord).forEach(key => {
      if (bookingRecord[key] === undefined) delete bookingRecord[key];
    });

    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingRecord])
      .select();

    if (error) {
      console.error('❌ Booking Insert Error:', error);
      return res.status(500).json({ error: 'Failed to store booking', details: error.message });
    }

    console.log('✅ Booking Created Successfully:', data);
    res.status(200).json({ status: 'Booking created successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
