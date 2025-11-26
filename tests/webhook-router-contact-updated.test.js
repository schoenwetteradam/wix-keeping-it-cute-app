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

describe('webhook-router contact updated', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })

  test('upserts contact by email', async () => {
    const logsQuery = createQuery({ data: {}, error: null })
    const contactQuery = createQuery({ data: [{ id: '1' }], error: null })
    const from = jest.fn((table) => {
      if (table === 'webhook_logs') return logsQuery
      if (table === 'contacts') return contactQuery
      return createQuery({ data: {}, error: null })
    })
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({
      setCorsHeaders: jest.fn(),
      setWebhookCorsHeaders: jest.fn()
    }))

    const { default: handler } = require('../api/webhook-router.js')

    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        entityFqdn: 'wix.contacts.v4.contact',
        slug: 'updated',
        entityId: 'c1',
        updatedEvent: {
          currentEntity: {
            id: 'c1',
            info: {
              emails: { items: [{ email: 'a@b.com' }] },
              name: { first: 'A', last: 'B' }
            }
          }
        }
      }
    }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('contacts')
    expect(contactQuery.upsert).toHaveBeenCalled()
    const upsertOpts = contactQuery.upsert.mock.calls[0][1]
    expect(upsertOpts).toEqual({ onConflict: 'email', ignoreDuplicates: false })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
