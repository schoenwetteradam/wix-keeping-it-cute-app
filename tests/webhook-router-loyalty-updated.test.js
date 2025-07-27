// tests for loyalty event processing in api/webhook-router.js
const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.insert = jest.fn(() => promise)
  promise.update = jest.fn(() => promise)
  promise.upsert = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
  promise.select = jest.fn(() => promise)
  promise.maybeSingle = jest.fn(() => promise)
  return promise
}

const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this })
})

describe('webhook-router loyalty account updated', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })

  test('upserts loyalty record from webhook', async () => {
    const logsQuery = createQuery({ data: {}, error: null })
    const loyaltyQuery = createQuery({ data: { id: 'l1' }, error: null })
    const from = jest.fn((table) => {
      if (table === 'webhook_logs') return logsQuery
      if (table === 'loyalty') return loyaltyQuery
      return createQuery({ data: {}, error: null })
    })
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/webhook-router.js')

    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        entityFqdn: 'wix.loyalty.v1.account',
        slug: 'updated',
        entityId: 'l1',
        updatedEvent: {
          currentEntity: {
            id: 'l1',
            contactId: 'c1',
            contact: { name: 'Jane Doe', email: 'jane@example.com' },
            points: { balance: 20, redeemed: 5 },
            lastActivityDate: '2024-01-01T00:00:00.000Z'
          }
        }
      }
    }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('loyalty')
    expect(loyaltyQuery.upsert).toHaveBeenCalled()
    const upsertData = loyaltyQuery.upsert.mock.calls[0][0]
    expect(upsertData.contact_id).toBe('c1')
    expect(upsertData.points_balance).toBe(20)
    expect(upsertData.redeemed_points).toBe(5)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
