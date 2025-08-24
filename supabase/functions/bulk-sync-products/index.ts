import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchAllWixProducts } from '../_shared/wix.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function processBatch(products: any[]) {
  const { error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'wix_product_id' })
  if (error) throw error
}

export default async function bulkSyncProducts(req: Request): Promise<Response> {
  try {
    const wixProducts = await fetchAllWixProducts()
    for (let i = 0; i < wixProducts.length; i += 100) {
      const batch = wixProducts.slice(i, i + 100)
      await processBatch(batch)
    }
    return new Response(
      JSON.stringify({ synced: wixProducts.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
