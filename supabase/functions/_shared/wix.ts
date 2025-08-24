const WIX_ACCESS_TOKEN = Deno.env.get('WIX_ACCESS_TOKEN') ?? ''

async function fetchFromWix(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`https://www.wixapis.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WIX_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    throw new Error(`Wix API request failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchAllWixBookings(startDate = '2020-01-01') {
  const all: any[] = []
  let cursor: string | null = null
  do {
    const data = await fetchFromWix('/bookings/v1/bookings/query', {
      filter: { startDate: { $gte: startDate } },
      cursorPaging: cursor ? { cursor } : { limit: 100 }
    })
    all.push(...(data.bookings ?? []))
    cursor = data.pagingMetadata?.cursors?.next ?? null
  } while (cursor)
  return all
}

export async function fetchAllWixContacts() {
  const all: any[] = []
  let cursor: string | null = null
  do {
    const data = await fetchFromWix('/contacts/v1/contacts/query', {
      cursorPaging: cursor ? { cursor } : { limit: 100 }
    })
    all.push(...(data.contacts ?? []))
    cursor = data.pagingMetadata?.cursors?.next ?? null
  } while (cursor)
  return all
}

export async function fetchAllWixOrders(startDate = '2020-01-01') {
  const all: any[] = []
  let cursor: string | null = null
  do {
    const data = await fetchFromWix('/stores/v1/orders/query', {
      filter: { createdDate: { $gte: startDate } },
      cursorPaging: cursor ? { cursor } : { limit: 100 }
    })
    all.push(...(data.orders ?? []))
    cursor = data.pagingMetadata?.cursors?.next ?? null
  } while (cursor)
  return all
}

export async function fetchAllWixProducts() {
  const all: any[] = []
  let cursor: string | null = null
  do {
    const data = await fetchFromWix('/stores/v1/products/query', {
      cursorPaging: cursor ? { cursor } : { limit: 100 }
    })
    all.push(...(data.products ?? []))
    cursor = data.pagingMetadata?.cursors?.next ?? null
  } while (cursor)
  return all
}
