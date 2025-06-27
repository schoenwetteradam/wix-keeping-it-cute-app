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
    const rawBody = req.body
    console.log('🔄 Booking Updated Raw:', JSON.stringify(rawBody, null, 2))

    // Handle both direct booking objects and Wix webhook envelopes
    let bookingData = rawBody
    if (rawBody?.updatedEvent) {
      bookingData =
        rawBody.updatedEvent.currentEntity ||
        (typeof rawBody.updatedEvent.currentEntityAsJson === 'string'
          ? JSON.parse(rawBody.updatedEvent.currentEntityAsJson)
          : rawBody.updatedEvent.currentEntityAsJson) ||
        rawBody.updatedEvent.entity ||
        rawBody
    }

    console.log('🔄 Parsed Booking Data:', JSON.stringify(bookingData, null, 2))

    const updateData = {
      customer_email: bookingData.contactDetails?.email || bookingData.formInfo?.email,
      customer_name: `${bookingData.contactDetails?.firstName || ''} ${bookingData.contactDetails?.lastName || ''}`.trim(),
      customer_phone: bookingData.contactDetails?.phone,
      service_name: bookingData.service?.name || bookingData.serviceInfo?.name,
      service_duration: bookingData.service?.duration || bookingData.serviceInfo?.duration,
      appointment_date: bookingData.startDate || bookingData.start?.timestamp,
      end_time: bookingData.endDate || bookingData.end?.timestamp,
      total_price: bookingData.totalPrice || bookingData.payment?.finalPrice,
      staff_member: bookingData.staffMember?.name || bookingData.resource?.name,
      notes: bookingData.additionalFields?.notes || bookingData.formInfo?.additionalFields,
      status: bookingData.status,
      payment_status: bookingData.paymentStatus?.toLowerCase(),
      revision: parseInt(bookingData.revision) || undefined,
      payload: bookingData,
      updated_at: new Date().toISOString(),
      updated_date: bookingData.updatedDate
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('wix_booking_id', bookingData.id || bookingData.bookingId)
      .select()
      .single();

    if (error) {
      console.error('❌ Booking Update Error:', error);
      return res.status(500).json({ error: 'Failed to update booking', details: error.message });
    }

    // Update related usage session if it exists
    try {
      await supabase
        .from('product_usage_sessions')
        .update({
          customer_email: updateData.customer_email,
          customer_name: updateData.customer_name,
          service_performed: updateData.service_name
        })
        .eq('booking_id', bookingData.id || bookingData.bookingId);
    } catch (usageError) {
      console.error('⚠️ Product usage session update failed:', usageError.message);
    }

    console.log('✅ Booking Updated Successfully:', data);
    res.status(200).json({ status: 'Booking updated successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
