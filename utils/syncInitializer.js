import { createSupabaseClient } from './supabaseClient'

export class SyncInitializer {
  constructor() {
    this.supabase = createSupabaseClient()
  }

  async initialize({ type = 'all', limit = 100 } = {}) {
    const types = ['bookings', 'contacts', 'products']
    const targets = type === 'all' ? types : [type]

    for (const table of targets) {
      await this.queueTable(table, limit)
    }
  }

  async queueTable(table, limit) {
    const { data, error } = await this.supabase
      .from(table)
      .select('id')
      .limit(limit)
    if (error || !data) return

    const rows = data.map(r => ({
      entity_type: table.slice(0, -1),
      entity_id: r.id,
      operation_type: 'create',
      status: 'pending'
    }))
    if (rows.length) {
      await this.supabase.from('sync_operations').insert(rows)
    }
  }
}
