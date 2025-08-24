import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchAllWixContacts } from '../_shared/wix.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function processBatch(contacts: any[]) {
  const { error } = await supabase
    .from('contacts')
    .upsert(contacts, { onConflict: 'wix_contact_id' })
  if (error) throw error
}

export default async function bulkSyncContacts(req: Request): Promise<Response> {
  try {
    const wixContacts = await fetchAllWixContacts()
    for (let i = 0; i < wixContacts.length; i += 100) {
      const batch = wixContacts.slice(i, i + 100)
      await processBatch(batch)
    }
    return new Response(
      JSON.stringify({ synced: wixContacts.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
