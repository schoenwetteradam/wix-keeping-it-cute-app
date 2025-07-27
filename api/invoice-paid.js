import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const invoiceData = req.body;
    console.log('📄 Invoice Paid:', JSON.stringify(invoiceData, null, 2));

    // Store invoice as an order since they're similar
    const invoiceRecord = {
      wix_order_id: invoiceData.id || invoiceData.invoiceId,
      order_number: invoiceData.number || invoiceData.invoiceNumber,
      customer_email: invoiceData.customer?.email || invoiceData.billingInfo?.email,
      total_amount: invoiceData.total || invoiceData.amount,
      currency: invoiceData.currency || 'USD',
      payment_status: 'paid',
      fulfillment_status: 'invoice',
      items: invoiceData.lineItems || invoiceData.items,
      billing_info: invoiceData.billingInfo || invoiceData.customer,
      payload: invoiceData,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(invoiceRecord).forEach(key => {
      if (invoiceRecord[key] === undefined) delete invoiceRecord[key];
    });

    const { data, error } = await supabase
      .from('orders')
      .upsert(invoiceRecord, { onConflict: 'wix_order_id', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('❌ Invoice Upsert Error:', error);
      return res.status(500).json({ error: 'Failed to process invoice', details: error.message });
    }

    console.log('✅ Invoice Processed Successfully:', data);
    res.status(200).json({ status: 'Invoice processed successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
