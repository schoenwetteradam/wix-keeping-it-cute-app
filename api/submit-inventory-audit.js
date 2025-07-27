// api/submit-inventory-audit.js - Simplified without email
import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const auditData = req.body;
    console.log('📊 Processing inventory audit submission...');

    // Validate required fields
    if (!auditData.staff_member || !auditData.audit_results) {
      return res.status(400).json({ error: 'Missing required audit data' });
    }

    // Store audit in database
    const auditRecord = {
      staff_member: auditData.staff_member,
      audit_date: auditData.audit_date,
      total_products_audited: auditData.total_products_audited,
      discrepancies_found: auditData.discrepancies_found,
      total_discrepancy_value: auditData.total_discrepancy_value,
      audit_summary: auditData.summary,
      audit_results: auditData.audit_results,
      status: 'completed', // Changed from 'pending_approval' since no email
      submitted_at: new Date().toISOString()
    };

    const { data: savedAudit, error: auditError } = await supabase
      .from('inventory_audits')
      .insert([auditRecord])
      .select()
      .single();

    if (auditError) {
      console.error('❌ Database error:', auditError);
      return res.status(500).json({ 
        error: 'Failed to save audit to database', 
        details: auditError.message 
      });
    }

    // Log audit submission
    await supabase
      .from('system_metrics')
      .insert({
        metric_type: 'inventory_audit_submitted',
        metric_data: {
          audit_id: savedAudit?.id,
          staff_member: auditData.staff_member,
          total_products: auditData.total_products_audited,
          discrepancies: auditData.discrepancies_found,
          discrepancy_value: auditData.total_discrepancy_value,
          timestamp: new Date().toISOString()
        }
      });

    console.log('✅ Inventory audit submitted successfully');

    res.status(200).json({
      success: true,
      message: 'Inventory audit submitted successfully',
      audit_id: savedAudit?.id,
      audit_summary: {
        total_products: auditData.total_products_audited,
        discrepancies: auditData.discrepancies_found,
        discrepancy_value: auditData.total_discrepancy_value
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Audit submission error:', error);
    res.status(500).json({
      error: 'Failed to submit inventory audit',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
