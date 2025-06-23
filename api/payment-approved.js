// api/payment-approved.js - New webhook for Wix payment processing
import { createClient } from '@supabase/supabase-js'
import { setCorsHeaders } from '../utils/cors'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wix-webhook-signature');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    console.log('💰 Processing payment approved webhook...');
    
    const paymentData = req.body;
    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    
    // Store payment record
    const paymentRecord = {
      wix_payment_id: paymentData.id || paymentData.payment_id,
      wix_order_id: paymentData.order_id,
      amount: paymentData.amount || paymentData.finalPrice?.amount,
      currency: paymentData.currency || 'USD',
      status: 'APPROVED',
      payment_method: paymentData.payment_method || paymentData.paymentMethod?.type,
      customer_email: paymentData.customer_email || paymentData.buyerInfo?.email,
      fees: paymentData.fees?.total || 0,
      created_date: paymentData.created_date || new Date().toISOString(),
      approved_date: new Date().toISOString(),
      metadata: paymentData
    };

    const { data: payment, error: paymentError } = await supabase
      .from('wix_payments')
      .upsert(paymentRecord, { 
        onConflict: 'wix_payment_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Payment record error:', paymentError);
      throw paymentError;
    }

    console.log('✅ Payment recorded:', payment.id);

    // Find and update the associated appointment
    let appointmentUpdated = false;
    if (paymentData.order_id || paymentData.booking_id) {
      const { data: appointment, error: appointmentError } = await supabase
        .from('salon_appointments')
        .update({
          payment_status: 'paid',
          payment_amount: payment.amount,
          payment_date: new Date().toISOString(),
          payment_fees: payment.fees,
          wix_payment_id: payment.wix_payment_id,
          status: 'confirmed'
        })
        .or(`wix_order_id.eq.${paymentData.order_id},wix_booking_id.eq.${paymentData.booking_id}`)
        .select(`
          *,
          customers(*),
          salon_services(*)
        `)
        .single();

      if (!appointmentError && appointment) {
        appointmentUpdated = true;
        console.log('✅ Appointment updated with payment info:', appointment.id);

        // Record revenue metric
        await supabase
          .from('business_metrics')
          .insert({
            business_type: 'salon',
            metric_name: 'revenue',
            metric_value: payment.amount,
            metric_date: new Date().toISOString().split('T')[0],
            metadata: {
              payment_id: payment.wix_payment_id,
              appointment_id: appointment.id,
              service_name: appointment.salon_services?.name,
              customer_email: appointment.customers?.email
            }
          });

        // Send confirmation email could go here
        console.log('📧 Payment confirmation ready for:', appointment.customers?.email);
      }
    }

    // Link payment to appointment record
    if (payment && appointmentUpdated) {
      await supabase
        .from('wix_payments')
        .update({ appointment_id: appointment.id })
        .eq('id', payment.id);
    }

    // Log webhook processing
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'webhook_payment_approved',
        metric_data: {
          success: true,
          payment_id: payment.wix_payment_id,
          amount: payment.amount,
          appointment_updated: appointmentUpdated,
          processed_at: new Date().toISOString()
        }
      });

    res.status(200).json({ 
      status: 'success',
      message: 'Payment processed successfully',
      payment: {
        id: payment.wix_payment_id,
        amount: payment.amount,
        currency: payment.currency,
        appointment_updated: appointmentUpdated
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Payment Webhook Error:', err);
    
    // Log failed webhook
    try {
      await supabase
        .from('system_metrics')
        .insert({
          metric_type: 'webhook_payment_failed',
          metric_data: {
            success: false,
            error_message: err.message,
            payload: req.body,
            processed_at: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.error('❌ Failed to log payment error:', logError);
    }
    
    res.status(500).json({ 
      error: 'Failed to process payment webhook', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
