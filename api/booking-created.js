// api/booking-created.js - Updated for new database schema
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
    console.log('Raw booking data:', JSON.stringify(bookingData, null, 2));
    
    // Handle customer data first (upsert to customers table)
    let customer = null;
    if (bookingData.contact || bookingData.contactDetails) {
      const contactInfo = bookingData.contact || bookingData.contactDetails;
      
      const customerData = {
        email: contactInfo.email || bookingData.booking_contact_email,
        first_name: contactInfo.firstName || contactInfo.name?.first || bookingData.booking_contact_first_name,
        last_name: contactInfo.lastName || contactInfo.name?.last || bookingData.booking_contact_last_name,
        phone: contactInfo.phone || bookingData.booking_contact_phone,
        business_type: 'salon'
      };

      const { data: customerResult, error: customerError } = await supabase
        .from('customers')
        .upsert(customerData, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (customerError) {
        console.error('❌ Customer upsert error:', customerError);
        // Continue with booking creation even if customer fails
      } else {
        customer = customerResult;
        console.log('✅ Customer upserted:', customer.id);
      }
    }

    // Find the service in our database using Wix Service ID
    let serviceId = null;
    if (bookingData.service_id) {
      const { data: serviceData } = await supabase
        .from('salon_services')
        .select('id, name, price, duration_minutes')
        .eq('wix_service_id', bookingData.service_id)
        .single();
      
      if (serviceData) {
        serviceId = serviceData.id;
        console.log('✅ Found service:', serviceData.name);
      }
    }

    // Find staff member by email or name
    let staffId = null;
    if (bookingData.staff_member_email || bookingData.staff_member_name) {
      let staffQuery = supabase.from('staff').select('id, first_name, last_name');
      
      if (bookingData.staff_member_email) {
        staffQuery = staffQuery.eq('email', bookingData.staff_member_email);
      } else if (bookingData.staff_member_name) {
        // Search by name (this might need adjustment based on your staff data)
        staffQuery = staffQuery.or(`first_name.ilike.%${bookingData.staff_member_name}%,last_name.ilike.%${bookingData.staff_member_name}%`);
      }
      
      const { data: staffData } = await staffQuery.single();
      if (staffData) {
        staffId = staffData.id;
        console.log('✅ Found staff:', `${staffData.first_name} ${staffData.last_name}`);
      }
    }

    // Create appointment record
    const appointmentData = {
      customer_id: customer?.id,
      service_id: serviceId,
      staff_id: staffId,
      wix_booking_id: bookingData.booking_id || bookingData.id,
      wix_order_id: bookingData.order_id,
      appointment_date: bookingData.start_date || bookingData.startDate,
      duration_minutes: bookingData.duration || 60, // Default 60 minutes
      status: 'confirmed',
      payment_status: bookingData.payment_status === 'PAID' ? 'paid' : 'pending',
      payment_method: 'wix',
      total_amount: bookingData.price?.value || bookingData.total_price,
      notes: bookingData.notes || extractNotes(bookingData.additional_fields),
      created_at: new Date().toISOString()
    };

    const { data: appointment, error: appointmentError } = await supabase
      .from('salon_appointments')
      .insert([appointmentData])
      .select(`
        *,
        customers(*),
        salon_services(*),
        staff(*)
      `)
      .single();

    if (appointmentError) {
      console.error('❌ Appointment creation error:', appointmentError);
      throw appointmentError;
    }

    console.log('✅ Appointment created:', appointment.id);

    // Record business metric
    await supabase
      .from('business_metrics')
      .insert({
        business_type: 'salon',
        metric_name: 'appointment_created',
        metric_value: 1,
        metric_date: new Date().toISOString().split('T')[0],
        metadata: {
          appointment_id: appointment.id,
          service_name: bookingData.service_name,
          wix_booking_id: bookingData.booking_id
        }
      });

    // Log webhook for debugging
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'webhook_booking_created',
        metric_data: {
          success: true,
          appointment_id: appointment.id,
          wix_booking_id: bookingData.booking_id,
          customer_email: customer?.email,
          service_name: bookingData.service_name,
          processed_at: new Date().toISOString()
        }
      });

    res.status(200).json({ 
      status: 'success',
      message: 'Booking created successfully',
      appointment: {
        id: appointment.id,
        wix_booking_id: appointment.wix_booking_id,
        customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
        service_name: appointment.salon_services?.name || bookingData.service_name,
        appointment_date: appointment.appointment_date,
        staff_member: appointment.staff ? `${appointment.staff.first_name} ${appointment.staff.last_name}` : bookingData.staff_member_name
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Webhook Processing Error:', err);
    
    // Log failed webhook
    try {
      await supabase
        .from('system_metrics')
        .insert({
          metric_type: 'webhook_booking_created_failed',
          metric_data: {
            success: false,
            error_message: err.message,
            payload: req.body,
            processed_at: new Date().toISOString()
          }
        });
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

// Helper function to extract notes from additional fields
function extractNotes(additionalFields) {
  if (!additionalFields || !Array.isArray(additionalFields)) return null;
  
  try {
    const notesField = additionalFields.find(field => 
      field.label?.toLowerCase().includes('request') || 
      field.label?.toLowerCase().includes('notes') ||
      field.label?.toLowerCase().includes('special')
    );
    
    return notesField?.value || null;
  } catch (error) {
    console.error('❌ Error extracting notes:', error);
    return null;
  }
}
