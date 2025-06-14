import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Wix Public Key for JWT verification
const WIX_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp1t69dN5qbUAS00eazDF
MiI1Ek4Ehp78OyZxOkrFCmo8HQYJ1G9ZJOtKNF/zL+TTyAdlbNfvlBpcKVfLDc9U
ZWLnBb1HIVrXDTR68nn/xi9NNLZF6xd5M10sGqDgrLM/6STZlpBA4yafcjet3BPS
HvGQo36RHMxgvmVTkZo/TysaUAlvV4kzuezHvpw7alKQl/TwctVNTpCIVlpBjJN2
2qrhdGPk8kFwdgn1n9XwskzWP+fTiy542NGo/0d1fYOZSFSlwybh7ygi9BtFHfmt
oYciq9XsE/4PlRsA7kdl1aXlL6ZpwW3pti02ewIDAQAB
-----END PUBLIC KEY-----`;

export default async function handler(req, res) {
  console.log('🎯 === WIX WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body type:', typeof req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract the JWT token from request body
    const jwtToken = req.body;
    console.log('🔐 JWT Token received (length):', jwtToken?.length || 'undefined');
    
    if (!jwtToken || typeof jwtToken !== 'string') {
      throw new Error('Invalid JWT token in request body');
    }

    // Verify and decode the JWT token
    console.log('🔍 Verifying JWT with Wix public key...');
    const rawPayload = jwt.verify(jwtToken, WIX_PUBLIC_KEY);
    console.log('✅ JWT verified successfully');
    
    // Parse the nested data structure
    const event = JSON.parse(rawPayload.data);
    console.log('📋 Event type:', event.eventType);
    console.log('📋 Instance ID:', event.instanceId);
    
    const eventData = JSON.parse(event.data);
    console.log('📋 Event data keys:', Object.keys(eventData));

    // Process based on event type
    let result;
    switch (event.eventType) {
      case 'wix.bookings.v2.booking_created':
        console.log('📅 Processing booking created...');
        result = await processBookingCreated(eventData, event);
        break;
        
      case 'wix.bookings.v2.booking_updated':
        console.log('🔄 Processing booking updated...');
        result = await processBookingUpdated(eventData, event);
        break;
        
      case 'wix.contacts.v4.contact_created':
        console.log('👤 Processing contact created...');
        result = await processContactCreated(eventData, event);
        break;
        
      case 'wix.contacts.v4.contact_updated':
        console.log('📝 Processing contact updated...');
        result = await processContactUpdated(eventData, event);
        break;
        
      case 'wix.ecom.v1.order_paid':
        console.log('💰 Processing order paid...');
        result = await processOrderPaid(eventData, event);
        break;
        
      default:
        console.log('❓ Unknown event type:', event.eventType);
        result = await logUnknownEvent(event.eventType, eventData);
    }

    console.log('✅ === WEBHOOK PROCESSED SUCCESSFULLY ===');
    res.status(200).json({
      success: true,
      eventType: event.eventType,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ === WEBHOOK PROCESSING FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Log the failed webhook
    await logFailedWebhook(error, req.body);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Process booking created event
async function processBookingCreated(eventData, event) {
  try {
    console.log('📅 Full booking data:', JSON.stringify(eventData, null, 2));
    
    // Extract booking information - Wix v2 structure
    const booking = eventData.booking || eventData;
    
    // Step 1: Extract and process customer information
    let customer = null;
    const contactDetails = booking.contactDetails || {};
    
    if (contactDetails.contactId || contactDetails.email) {
      const customerData = {
        email: contactDetails.email || `customer-${Date.now()}@salon.com`,
        first_name: contactDetails.firstName || 'Customer',
        last_name: contactDetails.lastName || 'Unknown',
        phone: contactDetails.phone,
        business_type: 'salon'
      };
      
      console.log('👤 Upserting customer:', customerData);
      
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
      } else {
        customer = customerResult;
        console.log('✅ Customer processed:', customer.id);
      }
    }

    // Step 2: Process service information
    let service = null;
    const bookedService = booking.bookedEntity;
    
    if (bookedService && bookedService.title) {
      // Try to find existing service or create new one
      const serviceData = {
        name: bookedService.title,
        duration_minutes: bookedService.duration || 60,
        price: booking.totalPrice || 0,
        category: 'General',
        is_active: true
      };
      
      console.log('✨ Upserting service:', serviceData);
      
      const { data: serviceResult, error: serviceError } = await supabase
        .from('salon_services')
        .upsert(serviceData, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (serviceError) {
        console.error('❌ Service upsert error:', serviceError);
      } else {
        service = serviceResult;
        console.log('✅ Service processed:', service.id);
      }
    }

    // Step 3: Create the appointment
    const appointmentData = {
      customer_id: customer?.id,
      service_id: service?.id,
      wix_booking_id: booking.id,
      appointment_date: booking.startDate || booking.slot?.startDate,
      duration_minutes: parseInt
