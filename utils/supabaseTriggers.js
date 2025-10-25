import { getBrowserSupabaseClient } from './supabaseBrowserClient'

export const SupabaseTriggers = {
  setupRealTimeSync() {
    try {
      const supabase = getBrowserSupabaseClient()
      const channel = supabase
        .channel('wix-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
          queueSync('booking', payload.new)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, payload => {
          queueSync('contact', payload.new)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
          queueSync('product', payload.new)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.error('Failed to setup real-time sync', err)
    }
  }
}

async function queueSync(entityType, record) {
  if (!record || record.sync_status === 'synced') return
  try {
    const supabase = getBrowserSupabaseClient()
    await supabase.from('sync_operations').insert({
      entity_type: entityType,
      entity_id: record.id,
      operation_type: 'update',
      status: 'pending'
    })
  } catch (err) {
    console.error('Failed to queue sync operation', err)
  }
}
