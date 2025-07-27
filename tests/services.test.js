const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
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

describe('services handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/services.js')

    const req = { method: 'POST', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('handles supabase errors', async () => {
    const query = createQuery({ data: null, error: new Error('fail') })
    const from = jest.fn(() => query)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/services.js')

    const req = { method: 'GET', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('salon_services')
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to fetch services' }))
  })

  test('fetches services list', async () => {
    const servicesData = [
      { id: 1, category: 'Hair', price: 20 },
      { id: 2, category: 'Hair', price: 30 }
    ]
    const query = createQuery({ data: servicesData, error: null })
    const from = jest.fn(() => query)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/services.js')

    const req = { method: 'GET', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('salon_services')
    expect(query.select).toHaveBeenCalledWith('*')
    expect(query.order).toHaveBeenCalledWith('category')
    expect(query.order).toHaveBeenCalledWith('price')
    expect(query.eq).toHaveBeenCalledWith('is_active', true)

    const response = res.json.mock.calls[0][0]
    expect(response).toMatchObject({ success: true, services: servicesData })
    expect(typeof response.timestamp).toBe('string')
  })
})
