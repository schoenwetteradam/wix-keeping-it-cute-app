import { getBrowserSupabaseClient } from './supabaseBrowserClient'

// Sets up real-time listeners on key tables to queue sync operations
export const SupabaseTriggers = {
  setupRealTimeSync () {
    if (typeof window === 'undefined') return

    try {
      const supabase = getBrowserSupabaseClient()
      const channel = supabase.channel('wix-sync')
      const tables = ['bookings', 'contacts', 'products']

      tables.forEach(table => {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          payload => {
            const event = payload.eventType
            const entityId = payload.new?.id || payload.old?.id
            const operation = event === 'INSERT'
              ? 'create'
              : event === 'DELETE'
                ? 'delete'
                : 'update'

            // Avoid queuing when marked as synced
            if (payload.new?.sync_status === 'synced') return

            supabase.from('sync_operations').insert({
              entity_type: table.slice(0, -1),
              entity_id: entityId,
              operation_type: operation,
              status: 'pending'
            })
          }
        )
      })

      channel.subscribe()
    } catch (err) {
      console.error('Failed to set up real-time sync', err)
    }
  }
}

export default SupabaseTriggers
