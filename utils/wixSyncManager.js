import { createSupabaseClient } from './supabaseClient'
import { WixAPIManager } from './wixApiManager'

// Manages queueing and processing of sync operations between Supabase and Wix
export class WixSyncManager {
  constructor () {
    this.supabase = createSupabaseClient()
    this.wixApi = new WixAPIManager()
    const rate = parseInt(process.env.SYNC_RATE_LIMIT_PER_MINUTE || '60', 10)
    this.delayMs = rate > 0 ? Math.floor(60000 / rate) : 0
    this.maxRetries = 3
  }

  async queueOperation (entityType, entityId, operationType) {
    return this.supabase.from('sync_operations').insert({
      entity_type: entityType,
      entity_id: entityId,
      operation_type: operationType,
      status: 'pending'
    })
  }

  async processPending (limit = 50) {
    const { data: ops } = await this.supabase
      .from('sync_operations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (!ops || ops.length === 0) {
      return { processed: 0 }
    }

    let processed = 0
    for (const op of ops) {
      await this.processSingle(op)
      processed++
      if (this.delayMs) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs))
      }
    }
    return { processed }
  }

  async processSingle (op) {
    try {
      let result
      switch (op.entity_type) {
        case 'booking':
          result = await this.syncBooking(op)
          break
        case 'contact':
          result = await this.syncContact(op)
          break
        case 'product':
          result = await this.syncProduct(op)
          break
        default:
          throw new Error(`Unsupported entity type: ${op.entity_type}`)
      }

      await this.supabase
        .from('sync_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          wix_entity_id: result?.wixEntityId || null
        })
        .eq('id', op.id)
    } catch (error) {
      console.error(`❌ Sync failed: ${op.operation_type} ${op.entity_type}`, error)
      const retries = (op.retry_count || 0) + 1
      const status = retries >= this.maxRetries ? 'failed' : 'pending'
      await this.supabase
        .from('sync_operations')
        .update({
          status,
          retry_count: retries,
          error_message: error.message
        })
        .eq('id', op.id)
    }
  }

  async syncBooking (op) {
    const { data: booking } = await this.supabase
      .from('bookings')
      .select('wix_booking_id')
      .eq('id', op.entity_id)
      .single()

    // Placeholder: here you'd call the Wix Bookings API
    return { wixEntityId: booking?.wix_booking_id || null }
  }

  async syncContact (op) {
    const { data: contact } = await this.supabase
      .from('contacts')
      .select('wix_contact_id')
      .eq('id', op.entity_id)
      .single()

    return { wixEntityId: contact?.wix_contact_id || null }
  }

  async syncProduct (op) {
    const { data: product } = await this.supabase
      .from('products')
      .select('wix_product_id')
      .eq('id', op.entity_id)
      .single()

    return { wixEntityId: product?.wix_product_id || null }
  }

  async retryFailed () {
    await this.supabase
      .from('sync_operations')
      .update({ status: 'pending', error_message: null })
      .eq('status', 'failed')
  }
}

export const wixSyncManager = new WixSyncManager()
export default wixSyncManager
