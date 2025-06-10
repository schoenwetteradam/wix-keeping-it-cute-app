// api/booking-created.js - Complete handler for your Wix booking webhook
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wix-webhook-signature');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    console.log('📅 Processing booking created webhook...');
    
    const bookingData = req.body;
    
    // Verify webhook signature (optional but recommended)
    const signature = req.headers['x-wix-webhook-signature'];
    // Add signature verification logic here if needed
    
    // Extract key booking information
    const booking = {
      wix_booking_id: bookingData.booking_id,
      wix_order_id: bookingData.order_id,
      service_name: bookingData.service_name,
      service_id: bookingData.service_id,
      customer_contact_id: bookingData.contact_id,
      customer_first_name: bookingData.booking_contact_first_name || bookingData.contact?.name?.first,
      customer_last_name: bookingData.booking_contact_last_name || bookingData.contact?.name?.last,
      customer_email: bookingData.contact?.email,
      customer_phone: bookingData.booking_contact_phone || bookingData.contact?.phone,
      staff_member_name: bookingData.staff_member_name,
      staff_member_email: bookingData.staff_member_email,
      start_date: bookingData.start_date,
      end_date: bookingData.end_date,
      start_timestamp: bookingData.start_time_timestamp,
      business_timezone: bookingData.business_time_zone,
      location: bookingData.location,
      location_id: bookingData.location_id,
      pricing_plan: bookingData.pricing_plan,
      service_type: bookingData.service_type,
      number_of_participants: bookingData.number_of_participants,
      approval_required: bookingData.approval_service,
      online_conference_enabled: bookingData.online_conference_enabled,
      online_conference_url: bookingData.online_conference_url,
      price_value: bookingData.price?.value,
      price_currency: bookingData.price?.currency || bookingData.currency,
      remaining_amount_due: bookingData.remaining_amount_due?.value,
      custom_form_data: JSON.stringify(bookingData.custom_form_fields || []),
      booking_creation_date: bookingData.booking_creation_date,
      metasite_id: bookingData.metasite_id,
      instance_id: bookingData.instance_id,
      status: 'confirmed',
      created_at: new Date().toISOString()
    };
    
    // Insert booking into database
    const { data: insertedBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert([booking])
      .select()
      .single();
    
    if (bookingError) {
      console.error('❌ Booking Insert Error:', bookingError);
      throw bookingError;
    }
    
    console.log('✅ Booking created:', insertedBooking.id);
    
    // Handle customer data (upsert to avoid duplicates)
    if (bookingData.contact) {
      const customer = {
        wix_contact_id: bookingData.contact_id,
        first_name: bookingData.contact.name?.first,
        last_name: bookingData.contact.name?.last,
        email: bookingData.contact.email,
        phone: bookingData.contact.phone,
        company: bookingData.contact.company,
        job_title: bookingData.contact.jobTitle,
        birthdate: bookingData.contact.birthdate,
        locale: bookingData.contact.locale,
        address_line1: bookingData.contact.address?.addressLine,
        address_line2: bookingData.contact.address?.addressLine2,
        city: bookingData.contact.address?.city,
        postal_code: bookingData.contact.address?.postalCode,
        country: bookingData.contact.address?.country,
        subdivision: bookingData.contact.address?.subdivision,
        formatted_address: bookingData.contact.address?.formattedAddress,
        image_url: bookingData.contact.imageUrl,
        wix_created_date: bookingData.contact.createdDate,
        wix_updated_date: bookingData.contact.updatedDate,
        updated_at: new Date().toISOString()
      };
      
      // Upsert customer (insert or update if exists)
      const { error: customerError } = await supabase
        .from('contacts')
        .upsert(customer, { 
          onConflict: 'wix_contact_id',
          ignoreDuplicates: false 
        });
      
      if (customerError) {
        console.error('❌ Customer Upsert Error:', customerError);
        // Don't throw here - booking is more important than customer data
      } else {
        console.log('✅ Customer data updated');
      }
    }
    
    // Log the webhook for debugging
    const webhookLog = {
      webhook_type: 'booking_created',
      wix_booking_id: bookingData.booking_id,
      payload: JSON.stringify(bookingData),
      processed_at: new Date().toISOString(),
      status: 'success'
    };
    
    await supabase
      .from('webhook_logs')
      .insert([webhookLog]);
    
    // Check if any products were used (custom fields like suef_product_used_1)
    const productUsageData = {};
    Object.keys(bookingData).forEach(key => {
      if (key.includes('product_used') || key.includes('suef_product')) {
        productUsageData[key] = bookingData[key];
      }
    });
    
    if (Object.keys(productUsageData).length > 0) {
      console.log('🔍 Product usage data detected:', productUsageData);
      // You can process product usage here if needed
    }
    
    res.status(200).json({ 
      status: 'success',
      message: 'Booking created successfully',
      booking_id: insertedBooking.id,
      wix_booking_id: bookingData.booking_id,
      customer_name: `${booking.customer_first_name} ${booking.customer_last_name}`,
      service_name: booking.service_name,
      start_date: booking.start_date,
      staff_member: booking.staff_member_name,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Webhook Processing Error:', err);
    
    // Log failed webhook
    try {
      await supabase
        .from('webhook_logs')
        .insert([{
          webhook_type: 'booking_created',
          payload: JSON.stringify(req.body),
          processed_at: new Date().toISOString(),
          status: 'failed',
          error_message: err.message
        }]);
    } catch (logError) {
      console.error('❌ Failed to log webhook error:', logError);
    }
    
    res.status(500).json({ 
      error: 'Failed to process booking webhook', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
