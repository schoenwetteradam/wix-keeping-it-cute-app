// tests for api/get-loyalty.js
const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.limit = jest.fn(() => promise)
  promise.order = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
  return promise
}

const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this }),
  end: jest.fn(function(){ return this })
})

beforeEach(() => {
  jest.resetModules()
  process.env.SUPABASE_URL = 'http://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
})

describe('get-loyalty handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/get-loyalty.js')

    const req = { method: 'POST', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('fetches loyalty records and returns result', async () => {
    const loyaltyData = [{ id: 1 }]
    const query = createQuery({ data: loyaltyData, error: null })
    const from = jest.fn(() => query)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/get-loyalty.js')

    const req = { method: 'GET', query: { limit: '5' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('loyalty')
    expect(query.select).toHaveBeenCalledWith('*')
    expect(query.limit).toHaveBeenCalledWith(5)
    expect(query.order).toHaveBeenCalledWith('last_activity', { ascending: false })

    const response = res.json.mock.calls[0][0]
    expect(response).toMatchObject({
      success: true,
      loyalty: loyaltyData,
      count: loyaltyData.length
    })
    expect(typeof response.timestamp).toBe('string')
  })

  test('filters by email when provided', async () => {
    const loyaltyData = [{ id: 1 }]
    const query = createQuery({ data: loyaltyData, error: null })
    const from = jest.fn(() => query)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/get-loyalty.js')

    const req = { method: 'GET', query: { email: 'a@example.com' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('loyalty')
    expect(query.select).toHaveBeenCalledWith('*')
    expect(query.eq).toHaveBeenCalledWith('email', 'a@example.com')
    expect(query.order).toHaveBeenCalledWith('last_activity', { ascending: false })
    const response = res.json.mock.calls[0][0]
    expect(response).toMatchObject({ success: true })
  })
})
