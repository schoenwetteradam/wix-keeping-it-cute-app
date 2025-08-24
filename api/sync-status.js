// api/sync-status.js - Monitor and control sync operations
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET,POST,DELETE')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getSyncStatus(req, res)
      case 'POST':
        return await controlSync(req, res)
      case 'DELETE':
        return await resetSync(req, res)
      default:
        return res.status(405).json({ error: 'Method Not Allowed' })
    }
  } catch (error) {
    console.error('Sync status API error:', error)
    res.status(500).json({ error: error.message })
  }
}

async function getSyncStatus(req, res) {
  const { detail = 'summary' } = req.query
  
  try {
    // Get overall sync health
    const syncHealth = await getSyncHealthReport()
    
    if (detail === 'detailed') {
      // Get detailed breakdown
      const detailed = await getDetailedSyncStatus()
      return res.json({
        success: true,
        sync_health: syncHealth,
        detailed_status: detailed,
        last_updated: new Date().toISOString()
      })
    }
    
    return res.json({
      success: true,
      sync_health: syncHealth,
      last_updated: new Date().toISOString()
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message
    })
  }
}

async function controlSync(req, res) {
  const { action, tables, options = {} } = req.body
  
  try {
    switch (action) {
      case 'start':
        return await startSync(req, tables, options, res)
      case 'pause':
        return await pauseSync(res)
      case 'resume':
        return await resumeSync(res)
      case 'validate':
        return await validateSyncIntegrity(res)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Sync control failed',
      details: error.message
    })
  }
}

async function resetSync(req, res) {
  const { table, confirm } = req.query
  
  if (confirm !== 'true') {
    return res.status(400).json({
      error: 'Must include ?confirm=true to reset sync status'
    })
  }
  
  try {
    if (table && table !== 'all') {
      // Reset specific table
      await supabase
        .from(table)
        .update({ 
          sync_status: 'pending',
          last_synced_at: null 
        })
        .not('id', 'is', null)
    } else {
      // Reset all tables
      const tables = ['bookings', 'contacts', 'orders', 'products', 'loyalty']
      
      for (const tableName of tables) {
        try {
          await supabase
            .from(tableName)
            .update({ 
              sync_status: 'pending',
              last_synced_at: null 
            })
            .not('id', 'is', null)
        } catch (err) {
          console.log(`Table ${tableName} doesn't have sync columns - skipping`)
        }
      }
    }
    
    res.json({
      success: true,
      message: `Reset sync status for ${table || 'all tables'}`,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset sync status',
      details: error.message
    })
  }
}

// === SYNC HEALTH REPORTING ===

async function getSyncHealthReport() {
  try {
    // Get sync status for each table
    const tables = ['bookings', 'contacts', 'orders', 'products']
    const health = {}
    
    for (const table of tables) {
      try {
        const { data: tableHealth } = await supabase
          .from(table)
          .select('sync_status, last_synced_at')
          .not('sync_status', 'is', null)
        
        if (tableHealth) {
          const total = tableHealth.length
          const synced = tableHealth.filter(r => r.sync_status === 'synced').length
          const failed = tableHealth.filter(r => r.sync_status === 'failed').length
          const pending = tableHealth.filter(r => r.sync_status === 'pending').length
          
          const lastSync = tableHealth
            .map(r => r.last_synced_at)
            .filter(Boolean)
            .sort()
            .pop()
          
          health[table] = {
            total_records: total,
            synced: synced,
            failed: failed,
            pending: pending,
            success_rate: total > 0 ? ((synced / total) * 100).toFixed(1) : '0',
            last_sync: lastSync,
            status: getTableSyncStatus(synced, failed, pending, total)
          }
        }
      } catch (err) {
        health[table] = {
          status: 'no_sync_columns',
          message: 'Table does not have sync tracking columns'
        }
      }
    }
    
    // Get recent sync operations
    const { data: recentSyncs } = await supabase
      .from('webhook_logs')
      .select('event_type, webhook_status, logged_at, data')
      .like('event_type', '%sync%')
      .order('logged_at', { ascending: false })
      .limit(5)
    
    return {
      tables: health,
      recent_operations: recentSyncs || [],
      overall_status: calculateOverallHealth(health),
      last_check: new Date().toISOString()
    }
    
  } catch (error) {
    throw new Error(`Failed to get sync health: ${error.message}`)
  }
}

async function getDetailedSyncStatus() {
  try {
    // Get detailed relationship statistics
    const relationshipStats = await supabase.rpc('get_relationship_stats')
    
    // Get sync performance metrics
    const { data: performanceMetrics } = await supabase
      .from('webhook_logs')
      .select('event_type, logged_at, data')
      .like('event_type', '%sync%')
      .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('logged_at', { ascending: false })
    
    // Get data quality issues
    const qualityIssues = await getDataQualityReport()
    
    return {
      relationship_stats: relationshipStats,
      performance_metrics: performanceMetrics || [],
      data_quality: qualityIssues,
      generated_at: new Date().toISOString()
    }
    
  } catch (error) {
    throw new Error(`Failed to get detailed status: ${error.message}`)
  }
}

async function getDataQualityReport() {
  try {
    // Check for common data quality issues
    const issues = {}
    
    // Missing critical booking fields
    const { data: missingBookingFields } = await supabase
      .from('bookings')
      .select('id, customer_email, service_name, appointment_date, total_price')
      .or('customer_email.is.null,service_name.is.null,appointment_date.is.null')
      .limit(10)
    
    issues.missing_booking_fields = {
      count: missingBookingFields?.length || 0,
      examples: missingBookingFields || []
    }
    
    // Orphaned bookings (no customer link)
    const { data: orphanedBookings } = await supabase
      .from('bookings')
      .select('id, customer_email, service_name')
      .is('customer_id', null)
      .not('customer_email', 'is', null)
      .limit(10)
    
    issues.orphaned_bookings = {
      count: orphanedBookings?.length || 0,
      examples: orphanedBookings || []
    }
    
    // Invalid dates
    const { data: invalidDates } = await supabase
      .from('bookings')
      .select('id, appointment_date, end_time')
      .or('appointment_date.is.null,end_time.lt.appointment_date')
      .limit(10)
    
    issues.invalid_dates = {
      count: invalidDates?.length || 0,
      examples: invalidDates || []
    }
    
    // Duplicate wix_booking_ids
    const { data: duplicateBookings } = await supabase.rpc('find_duplicate_wix_bookings')
    
    issues.duplicate_bookings = {
      count: duplicateBookings?.length || 0,
      examples: duplicateBookings || []
    }
    
    return issues
    
  } catch (error) {
    return { error: error.message }
  }
}

// === HELPER FUNCTIONS ===

function getTableSyncStatus(synced, failed, pending, total) {
  if (total === 0) return 'empty'
  if (pending > 0) return 'in_progress'
  if (failed > synced) return 'mostly_failed'
  if (failed > 0) return 'partial_success'
  return 'fully_synced'
}

function calculateOverallHealth(tableHealth) {
  const tables = Object.values(tableHealth).filter(h => h.status !== 'no_sync_columns')
  
  if (tables.length === 0) return 'no_sync_data'
  
  const avgSuccessRate = tables
    .map(t => parseFloat(t.success_rate) || 0)
    .reduce((sum, rate) => sum + rate, 0) / tables.length
  
  if (avgSuccessRate >= 95) return 'excellent'
  if (avgSuccessRate >= 85) return 'good'
  if (avgSuccessRate >= 70) return 'fair'
  return 'poor'
}

async function startSync(req, tables, options, res) {
  // Trigger sync via internal API call
  const protocol = req.headers['x-forwarded-proto'] || 'http'
  const baseUrl = `${protocol}://${req.headers.host}`
  const syncResponse = await fetch(`${baseUrl}/api/sync-all-wix-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tables: tables || ['all'],
      batchSize: options.batchSize || 100,
      skipExisting: options.skipExisting !== false
    })
  })
  
  const result = await syncResponse.json()
  
  return res.json({
    success: true,
    message: 'Sync initiated',
    sync_result: result,
    timestamp: new Date().toISOString()
  })
}

async function pauseSync(res) {
  // Set sync pause flag in database
  await supabase
    .from('system_config')
    .upsert({
      key: 'sync_paused',
      value: 'true',
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })
  
  res.json({
    success: true,
    message: 'Sync operations paused',
    timestamp: new Date().toISOString()
  })
}

async function resumeSync(res) {
  // Remove sync pause flag
  await supabase
    .from('system_config')
    .delete()
    .eq('key', 'sync_paused')
  
  res.json({
    success: true,
    message: 'Sync operations resumed',
    timestamp: new Date().toISOString()
  })
}

async function validateSyncIntegrity(res) {
  try {
    console.log('🔍 Running comprehensive sync validation...')
    
    // Run validation queries
    const validation = {
      relationship_integrity: await checkRelationshipIntegrity(),
      data_completeness: await checkDataCompleteness(),
      duplicate_detection: await checkForDuplicates(),
      date_consistency: await checkDateConsistency(),
      business_logic_validation: await validateBusinessLogic()
    }
    
    const overallScore = calculateValidationScore(validation)
    
    res.json({
      success: true,
      validation_score: overallScore,
      validation_results: validation,
      recommendations: generateRecommendations(validation),
      validated_at: new Date().toISOString()
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    })
  }
}

// === VALIDATION FUNCTIONS ===

async function checkRelationshipIntegrity() {
  const { data: bookingRelationships } = await supabase.rpc('check_booking_relationships')
  const { data: orderRelationships } = await supabase.rpc('check_order_relationships')
  
  return {
    bookings: bookingRelationships || { customer_link_rate: 0, service_link_rate: 0, staff_link_rate: 0 },
    orders: orderRelationships || { customer_link_rate: 0 },
    status: (bookingRelationships?.customer_link_rate || 0) > 90 ? 'good' : 'needs_attention'
  }
}

async function checkDataCompleteness() {
  // Check for missing critical fields
  const { data: missingFields } = await supabase.rpc('check_missing_critical_fields')
  
  return {
    missing_fields_report: missingFields || [],
    status: (missingFields?.length || 0) < 50 ? 'good' : 'needs_attention'
  }
}

async function checkForDuplicates() {
  const { data: duplicateBookings } = await supabase.rpc('find_duplicate_bookings')
  const { data: duplicateContacts } = await supabase.rpc('find_duplicate_contacts')
  
  return {
    duplicate_bookings: duplicateBookings?.length || 0,
    duplicate_contacts: duplicateContacts?.length || 0,
    status: ((duplicateBookings?.length || 0) + (duplicateContacts?.length || 0)) === 0 ? 'good' : 'needs_cleanup'
  }
}

async function checkDateConsistency() {
  const { data: invalidDates } = await supabase
    .from('bookings')
    .select('id, appointment_date, end_time, service_duration')
    .or('appointment_date.is.null,end_time.lt.appointment_date')
    .limit(100)
  
  return {
    invalid_dates_count: invalidDates?.length || 0,
    examples: invalidDates?.slice(0, 5) || [],
    status: (invalidDates?.length || 0) === 0 ? 'good' : 'needs_fixing'
  }
}

async function validateBusinessLogic() {
  // Check business rule compliance
  const issues = []
  
  // Bookings without prices
  const { count: noPriceBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .is('total_price', null)
    .neq('status', 'cancelled')
  
  if (noPriceBookings > 0) {
    issues.push({
      type: 'missing_prices',
      count: noPriceBookings,
      severity: 'high',
      description: 'Active bookings without prices'
    })
  }
  
  // Future appointments without staff
  const { count: noStaffBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .is('staff_id', null)
    .gte('appointment_date', new Date().toISOString())
    .neq('status', 'cancelled')
  
  if (noStaffBookings > 0) {
    issues.push({
      type: 'unassigned_staff',
      count: noStaffBookings,
      severity: 'medium',
      description: 'Future appointments without staff assignment'
    })
  }
  
  // Orders without payment status
  const { count: noPaymentStatus } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .is('payment_status', null)
  
  if (noPaymentStatus > 0) {
    issues.push({
      type: 'missing_payment_status',
      count: noPaymentStatus,
      severity: 'medium',
      description: 'Orders without payment status'
    })
  }
  
  return {
    issues: issues,
    status: issues.length === 0 ? 'good' : 'has_issues'
  }
}

function calculateValidationScore(validation) {
  let score = 100
  
  // Deduct points for issues
  Object.entries(validation).forEach(([category, result]) => {
    if (result.status === 'needs_attention') {
      score -= 15
    } else if (result.status === 'needs_cleanup' || result.status === 'needs_fixing') {
      score -= 10
    } else if (result.status === 'has_issues') {
      score -= 5
    }
  })
  
  return Math.max(0, score)
}

function generateRecommendations(validation) {
  const recommendations = []
  
  if (validation.relationship_integrity?.status === 'needs_attention') {
    recommendations.push({
      priority: 'high',
      action: 'Fix relationship linking',
      description: 'Run cleanup scripts to link orphaned records',
      sql: `
        -- Link orphaned bookings to customers
        UPDATE bookings SET customer_id = c.id
        FROM contacts c 
        WHERE bookings.customer_id IS NULL 
          AND bookings.customer_email = c.email;
      `
    })
  }
  
  if (validation.duplicate_detection?.status === 'needs_cleanup') {
    recommendations.push({
      priority: 'medium',
      action: 'Remove duplicates',
      description: 'Clean up duplicate records',
      sql: `
        -- Remove duplicate bookings (keep most recent)
        DELETE FROM bookings b1 
        WHERE EXISTS (
          SELECT 1 FROM bookings b2 
          WHERE b2.wix_booking_id = b1.wix_booking_id 
            AND b2.id > b1.id
        );
      `
    })
  }
  
  if (validation.date_consistency?.status === 'needs_fixing') {
    recommendations.push({
      priority: 'medium',
      action: 'Fix date inconsistencies',
      description: 'Correct invalid appointment dates and end times',
      sql: `
        -- Calculate missing end times
        UPDATE bookings 
        SET end_time = appointment_date + (service_duration || ' minutes')::INTERVAL
        WHERE end_time IS NULL 
          AND appointment_date IS NOT NULL 
          AND service_duration IS NOT NULL;
      `
    })
  }
  
  if (validation.business_logic_validation?.issues?.length > 0) {
    validation.business_logic_validation.issues.forEach(issue => {
      recommendations.push({
        priority: issue.severity,
        action: `Address ${issue.type}`,
        description: issue.description,
        count: issue.count
      })
    })
  }
  
  return recommendations
}

// === SQL HELPER FUNCTIONS (Create these in Supabase) ===

/*
Run these functions in your Supabase SQL editor:

-- Function to check booking relationships
CREATE OR REPLACE FUNCTION check_booking_relationships()
RETURNS TABLE(
  customer_link_rate NUMERIC,
  service_link_rate NUMERIC,
  staff_link_rate NUMERIC,
  total_bookings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(COUNT(customer_id)::NUMERIC / COUNT(*) * 100, 1) as customer_link_rate,
    ROUND(COUNT(service_id)::NUMERIC / COUNT(*) * 100, 1) as service_link_rate,
    ROUND(COUNT(staff_id)::NUMERIC / COUNT(*) * 100, 1) as staff_link_rate,
    COUNT(*) as total_bookings
  FROM bookings 
  WHERE sync_status = 'synced';
END;
$$ LANGUAGE plpgsql;

-- Function to check order relationships  
CREATE OR REPLACE FUNCTION check_order_relationships()
RETURNS TABLE(
  customer_link_rate NUMERIC,
  total_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(COUNT(customer_id)::NUMERIC / COUNT(*) * 100, 1) as customer_link_rate,
    COUNT(*) as total_orders
  FROM orders 
  WHERE sync_status = 'synced';
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate bookings
CREATE OR REPLACE FUNCTION find_duplicate_bookings()
RETURNS TABLE(
  wix_booking_id TEXT,
  duplicate_count BIGINT,
  booking_ids INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.wix_booking_id,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(b.id) as booking_ids
  FROM bookings b
  WHERE b.wix_booking_id IS NOT NULL
  GROUP BY b.wix_booking_id
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate contacts
CREATE OR REPLACE FUNCTION find_duplicate_contacts()
RETURNS TABLE(
  email TEXT,
  duplicate_count BIGINT,
  contact_ids TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.email,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(c.id::TEXT) as contact_ids
  FROM contacts c
  WHERE c.email IS NOT NULL
  GROUP BY c.email
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check missing critical fields
CREATE OR REPLACE FUNCTION check_missing_critical_fields()
RETURNS TABLE(
  table_name TEXT,
  field_name TEXT,
  missing_count BIGINT,
  total_count BIGINT,
  missing_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'bookings'::TEXT as table_name,
    'customer_email'::TEXT as field_name,
    COUNT(*) FILTER (WHERE customer_email IS NULL) as missing_count,
    COUNT(*) as total_count,
    ROUND(COUNT(*) FILTER (WHERE customer_email IS NULL)::NUMERIC / COUNT(*) * 100, 1) as missing_percentage
  FROM bookings
  
  UNION ALL
  
  SELECT 
    'bookings'::TEXT,
    'service_name'::TEXT,
    COUNT(*) FILTER (WHERE service_name IS NULL),
    COUNT(*),
    ROUND(COUNT(*) FILTER (WHERE service_name IS NULL)::NUMERIC / COUNT(*) * 100, 1)
  FROM bookings
  
  UNION ALL
  
  SELECT 
    'bookings'::TEXT,
    'appointment_date'::TEXT,
    COUNT(*) FILTER (WHERE appointment_date IS NULL),
    COUNT(*),
    ROUND(COUNT(*) FILTER (WHERE appointment_date IS NULL)::NUMERIC / COUNT(*) * 100, 1)
  FROM bookings;
END;
$$ LANGUAGE plpgsql;
*/
