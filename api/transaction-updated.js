// api/transaction-updated.js - Handle Wix Cashier transaction events
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('💳 Processing transaction updated webhook...');
    
    const webhookData = req.body;
    const transactionEvent = webhookData.transactionUpdatedEvent;
    
    if (!transactionEvent) {
      throw new Error('No transaction event data found');
    }

    const order = transactionEvent.order;
    const transaction = transactionEvent.transaction;
    
    console.log('Transaction details:', {
      transaction_id: transaction.id,
      order_id: order.wixAppOrderId,
      amount: transaction.amount.amount,
      status: transaction.status,
      payment_method: transaction.paymentMethod
    });

    // === SAVE TRANSACTION RECORD ===
    const transactionRecord = {
      wix_transaction_id: transaction.id,
      wix_order_id: order.wixAppOrderId,
      
      // Payment details
      amount: transaction.amount.amount,
      currency: transaction.amount.currency,
      status: transaction.status,
      payment_method: transaction.paymentMethod,
      payment_provider: transaction.paymentProvider,
      
      // Order details
      order_items: order.items,
      items_count: order.itemsTotalCount,
      
      // Timestamps
      created_at: transaction.createdAt,
      processed_at: new Date().toISOString(),
      
      // Raw data
      payload: webhookData,
      
      sync_status: 'synced'
    };

    const { data: savedTransaction, error: transactionError } = await supabase
      .from('wix_transactions')
      .upsert(transactionRecord, { 
        onConflict: 'wix_transaction_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Transaction save error:', transactionError);
      throw transactionError;
    }

    // === UPDATE RELATED ORDER WITH PAYMENT STATUS ===
    if (order.wixAppOrderId && transaction.status === 'APPROVED') {
      const { data: updatedOrder, error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'PAID',
          transaction_id: savedTransaction.id,
          updated_at: new Date().toISOString()
        })
        .eq('wix_order_id', order.wixAppOrderId)
        .select()
        .single();

      if (!orderUpdateError && updatedOrder) {
        console.log('✅ Updated order payment status to PAID');
        
        // === UPDATE RELATED BOOKINGS WITH PAYMENT STATUS ===
        const { data: updatedBookings, error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', updatedOrder.id)
          .select('id, service_name, total_price');

        if (!bookingUpdateError && updatedBookings) {
          console.log(`✅ Updated ${updatedBookings.length} bookings to paid status`);
        }
      }
    }

    // === LOG SUCCESS ===
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'transaction_updated',
        webhook_status: 'success',
        wix_id: transaction.id,
        data: {
          transaction_id: savedTransaction.id,
          amount: transaction.amount.amount,
          status: transaction.status,
          order_updated: !!order.wixAppOrderId
        }
      });

    return res.status(200).json({
      success: true,
      message: 'Transaction processed successfully',
      transaction: {
        id: savedTransaction.id,
        wix_transaction_id: savedTransaction.wix_transaction_id,
        amount: savedTransaction.amount,
        status: savedTransaction.status
      }
    });

  } catch (error) {
    console.error('❌ Transaction webhook failed:', error);
    
    // Log error
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: 'transaction_updated',
          webhook_status: 'failed',
          error_message: error.message,
          data: { error: error.message, payload: req.body }
        });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }
    
    return res.status(200).json({
      success: false,
      error: 'Transaction webhook processing failed',
      details: error.message
    });
  }
}
