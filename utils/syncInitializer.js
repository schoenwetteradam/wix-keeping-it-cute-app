import { createSupabaseClient } from './supabaseClient'

// Utility for bulk queuing sync operations for existing records
export class SyncInitializer {
  constructor () {
    this.supabase = createSupabaseClient()
  }

  async initialize ({ type = 'all', limit = 100 } = {}) {
    const types = type === 'all' ? ['bookings', 'contacts', 'products'] : [type]
    let queued = 0

    for (const table of types) {
      const { data: rows } = await this.supabase
        .from(table)
        .select('id')
        .limit(limit)

      for (const row of rows || []) {
        await this.supabase.from('sync_operations').insert({
          entity_type: table.slice(0, -1),
          entity_id: row.id,
          operation_type: 'create',
          status: 'pending'
        })
        queued++
      }
    }

    return { queued }
  }
}

export const syncInitializer = new SyncInitializer()
export default syncInitializer
