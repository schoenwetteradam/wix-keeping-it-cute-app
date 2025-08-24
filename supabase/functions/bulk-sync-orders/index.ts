import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchAllWixOrders } from '../_shared/wix.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function processBatch(orders: any[]) {
  const { error } = await supabase
    .from('orders')
    .upsert(orders, { onConflict: 'wix_order_id' })
  if (error) throw error
}

export default async function bulkSyncOrders(req: Request): Promise<Response> {
  try {
    const wixOrders = await fetchAllWixOrders()
    for (let i = 0; i < wixOrders.length; i += 100) {
      const batch = wixOrders.slice(i, i + 100)
      await processBatch(batch)
    }
    return new Response(
      JSON.stringify({ synced: wixOrders.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
