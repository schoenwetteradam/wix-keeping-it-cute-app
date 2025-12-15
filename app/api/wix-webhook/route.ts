import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

// Verify Wix webhook signature
function verifyWixWebhook(body: string, signature: string | null): boolean {
  if (!signature || !process.env.WIX_WEBHOOK_SECRET) {
    return false;
  }
  
  const hash = crypto
    .createHmac('sha256', process.env.WIX_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-wix-signature');
    
    // Verify webhook authenticity (optional - can be disabled for testing)
    if (process.env.WIX_WEBHOOK_SECRET && !verifyWixWebhook(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const data = JSON.parse(body);
    console.log('Webhook received:', data.eventType, data.entityId);
    
    try {
      switch(data.eventType) {
        case 'bookings.appointment_created':
        case 'bookings.appointment_updated':
          await handleBookingUpdate(data);
          break;
        case 'contacts.contact_created':
        case 'contacts.contact_updated':
          await handleContactUpdate(data);
          break;
        case 'stores.order_created':
        case 'stores.order_updated':
          await handleOrderUpdate(data);
          break;
        default:
          console.log('Unhandled event type:', data.eventType);
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return NextResponse.json({ error: 'Processing failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Webhook request error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

async function handleBookingUpdate(data: any) {
  const { entityId, entity } = data;
  
  if (!entity) {
    console.error('No entity data in booking webhook');
    return;
  }

  // First, ensure customer exists
  let customerId = null;
  if (entity.contactId || entity.contactDetails) {
    const contactId = entity.contactId || entity.contactDetails?.id;
    const contactName = entity.contactDetails?.name || entity.contact?.name || 'Unknown';
    const contactEmail = entity.contactDetails?.email || entity.contact?.email;
    const contactPhone = entity.contactDetails?.phone || entity.contact?.phone;

    if (contactId) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          wix_contact_id: contactId,
          name: contactName,
          email: contactEmail,
          phone: contactPhone
        }, { onConflict: 'wix_contact_id' })
        .select()
        .single();
      
      if (customerError) {
        console.error('Error upserting customer:', customerError);
      } else if (customer) {
        customerId = customer.id;
      }
    }
  }
  
  // Then create/update appointment
  const { error: appointmentError } = await supabase
    .from('appointments')
    .upsert({
      wix_booking_id: entityId,
      customer_id: customerId,
      service_name: entity.service?.name || entity.serviceName || 'Unknown Service',
      staff_member: entity.staffMember?.name || entity.staffMemberName,
      start_time: entity.startDate || entity.startTime,
      end_time: entity.endDate || entity.endTime,
      status: entity.status || 'pending',
      notes: entity.notes || entity.internalNotes
    }, { onConflict: 'wix_booking_id' });
  
  if (appointmentError) {
    console.error('Error upserting appointment:', appointmentError);
    throw appointmentError;
  }
}

async function handleContactUpdate(data: any) {
  const { entityId, entity } = data;
  
  if (!entity) {
    console.error('No entity data in contact webhook');
    return;
  }

  const { error } = await supabase
    .from('customers')
    .upsert({
      wix_contact_id: entityId,
      name: entity.name?.first && entity.name?.last 
        ? `${entity.name.first} ${entity.name.last}`.trim()
        : entity.name || entity.displayName || 'Unknown',
      email: entity.emails?.[0] || entity.email,
      phone: entity.phones?.[0] || entity.phone,
      notes: entity.notes || entity.description
    }, { onConflict: 'wix_contact_id' });
  
  if (error) {
    console.error('Error upserting contact:', error);
    throw error;
  }
}

async function handleOrderUpdate(data: any) {
  const { entityId, entity } = data;
  
  if (!entity) {
    console.error('No entity data in order webhook');
    return;
  }

  // First, ensure customer exists
  let customerId = null;
  if (entity.buyerInfo?.email || entity.contactId) {
    const contactId = entity.contactId || entity.buyerInfo?.email;
    const buyerName = entity.buyerInfo?.name || 'Unknown Customer';
    const buyerEmail = entity.buyerInfo?.email;
    const buyerPhone = entity.buyerInfo?.phone;

    if (contactId) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          wix_contact_id: contactId,
          name: buyerName,
          email: buyerEmail,
          phone: buyerPhone
        }, { onConflict: 'wix_contact_id' })
        .select()
        .single();
      
      if (customerError) {
        console.error('Error upserting customer for order:', customerError);
      } else if (customer) {
        customerId = customer.id;
      }
    }
  }
  
  // Then create/update order
  const { error: orderError } = await supabase
    .from('orders')
    .upsert({
      wix_order_id: entityId,
      customer_id: customerId,
      order_date: entity.dateCreated || entity.createdDate || new Date().toISOString(),
      total_amount: entity.priceSummary?.total?.amount || entity.totalPrice || 0,
      status: entity.fulfillmentStatus || entity.status || 'pending',
      items: entity.lineItems || entity.items || []
    }, { onConflict: 'wix_order_id' });
  
  if (orderError) {
    console.error('Error upserting order:', orderError);
    throw orderError;
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'wix-webhook-handler',
    timestamp: new Date().toISOString()
  });
}

