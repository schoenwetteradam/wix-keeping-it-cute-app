import { createSupabaseClient } from './supabaseClient'
import { WixAPIManager } from './wixApiManager'

export class WixSyncManager {
  constructor() {
    this.supabase = createSupabaseClient()
    this.wixApi = new WixAPIManager()
    this.maxRetries = 3
    this.rateLimit = parseInt(process.env.SYNC_RATE_LIMIT_PER_MINUTE || '60', 10)
  }

  async getStats() {
    const { data: pending } = await this.supabase
      .from('sync_operations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    const { data: failed } = await this.supabase
      .from('sync_operations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
    const { data: recent } = await this.supabase
      .from('sync_operations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    return {
      pending: pending?.length ?? 0,
      failed: failed?.length ?? 0,
      recent: recent || []
    }
  }

  async processPendingSyncs(limit = 50) {
    const { data: ops } = await this.supabase
      .from('sync_operations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (!ops?.length) return []

    const results = []
    for (const op of ops) {
      const res = await this.processSingleSync(op)
      results.push(res)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 60 / this.rateLimit))
    }
    return results
  }

  async retryFailedSyncs(limit = 50) {
    const { data: ops } = await this.supabase
      .from('sync_operations')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', this.maxRetries)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (!ops?.length) return []

    const results = []
    for (const op of ops) {
      const res = await this.processSingleSync(op)
      results.push(res)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 60 / this.rateLimit))
    }
    return results
  }

  async processSingleSync(syncOp) {
    try {
      await this.handleOperation(syncOp)
      await this.supabase
        .from('sync_operations')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', syncOp.id)
      return { id: syncOp.id, status: 'completed' }
    } catch (error) {
      const retries = (syncOp.retry_count || 0) + 1
      await this.supabase
        .from('sync_operations')
        .update({ status: 'failed', retry_count: retries, error: error.message })
        .eq('id', syncOp.id)
      return { id: syncOp.id, status: 'failed', error: error.message }
    }
  }

  async handleOperation(syncOp) {
    const table = this.getTableName(syncOp.entity_type)
    if (!table) throw new Error('Unknown entity type')

    // fetch entity
    const { data: entity, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', syncOp.entity_id)
      .single()
    if (error) throw error

    // Placeholder for Wix API integration
    // In real implementation, make API calls based on entity_type and operation_type
    await this.supabase
      .from(table)
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', syncOp.entity_id)

    return entity
  }

  getTableName(entityType) {
    if (entityType === 'booking') return 'bookings'
    if (entityType === 'contact') return 'contacts'
    if (entityType === 'product') return 'products'
    return null
  }

  async queueManualBooking(bookingId, operation = 'update') {
    await this.supabase.from('sync_operations').insert({
      entity_type: 'booking',
      entity_id: bookingId,
      operation_type: operation,
      status: 'pending'
    })
  }
}
