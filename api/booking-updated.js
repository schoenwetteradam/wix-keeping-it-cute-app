import { createSupabaseClient } from '../utils/supabaseClient'
import { addNotification } from '../utils/notifications'

const supabase = createSupabaseClient()

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

    if (updateData.service_name) {
      const { data: svc, error: svcError } = await supabase
        .from('salon_services')
        .select('id, duration_minutes, price')
        .ilike('name', updateData.service_name)
        .maybeSingle();

      if (svcError) {
        console.error('Service lookup error:', svcError.message);
      }

    if (svc) {
      updateData.service_id = svc.id;
      if (!updateData.service_duration) {
        updateData.service_duration = svc.duration_minutes;
      }
      if (!updateData.total_price) {
        updateData.total_price = svc.price;
      }
    }
  }

    // Link to contact/customer record
    if (bookingData.contactDetails?.contactId || updateData.customer_email) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .or(
          [
            bookingData.contactDetails?.contactId
              ? `wix_contact_id.eq.${bookingData.contactDetails.contactId}`
              : null,
            updateData.customer_email
              ? `email.eq.${updateData.customer_email}`
              : null
          ]
            .filter(Boolean)
            .join(',')
        )
        .maybeSingle();
      if (contact) {
        updateData.customer_id = contact.id;
      }
    }

    // Link to staff profile
    if (updateData.staff_member) {
      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('id')
        .ilike('full_name', updateData.staff_member)
        .maybeSingle();
      if (staff) {
        updateData.staff_id = staff.id;
      }
    }

    // Link to order if provided
    const wixOrderId = bookingData.order_id || bookingData.orderId;
    if (wixOrderId) {
      updateData.wix_order_id = wixOrderId;
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('wix_order_id', wixOrderId)
        .maybeSingle();
      if (order) {
        updateData.order_id = order.id;
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('wix_booking_id', bookingData.id || bookingData.bookingId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Booking Update Error:', error);
      return res.status(500).json({ error: 'Failed to update booking', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Booking not found' });
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

    // Update upcoming bookings cache
    try {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      const apptDate = new Date(data.appointment_date);
      if (apptDate >= now && apptDate < nextWeek) {
        await supabase
          .from('upcoming_bookings')
          .upsert(
            {
              booking_id: data.id,
              appointment_date: data.appointment_date,
              staff_id: data.staff_id,
              status: data.status,
              payment_status: data.payment_status
            },
            { onConflict: 'booking_id', ignoreDuplicates: false }
          );
      } else {
        await supabase.from('upcoming_bookings').delete().eq('booking_id', data.id);
      }
    } catch (cacheErr) {
      console.error('Upcoming bookings cache error:', cacheErr);
    }
    try {
      await addNotification({
        type: 'appointment',
        booking_id: data.id,
        message: 'Booking updated',
        created_at: new Date().toISOString()
      })
    } catch (notifyError) {
      console.error('Notification add failed:', notifyError)
    }
    res.status(200).json({ status: 'Booking updated successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
