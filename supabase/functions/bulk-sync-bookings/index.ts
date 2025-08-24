import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchAllWixBookings } from '../_shared/wix.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function processBatch(bookings: any[]) {
  const { error } = await supabase
    .from('bookings')
    .upsert(bookings, { onConflict: 'wix_booking_id' })
  if (error) throw error
}

export default async function bulkSyncBookings(req: Request): Promise<Response> {
  try {
    const wixBookings = await fetchAllWixBookings()
    for (let i = 0; i < wixBookings.length; i += 100) {
      const batch = wixBookings.slice(i, i + 100)
      await processBatch(batch)
    }
    return new Response(
      JSON.stringify({ synced: wixBookings.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
