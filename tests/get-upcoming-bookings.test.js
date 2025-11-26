// tests for api/get-upcoming-bookings.js
const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.gte = jest.fn(() => promise)
  promise.lt = jest.fn(() => promise)
  promise.order = jest.fn(() => promise)
  promise.limit = jest.fn(() => promise)
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

describe('get-upcoming-bookings handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/get-upcoming-bookings.js')

    const req = { method: 'POST', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('rejects invalid limit', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/get-upcoming-bookings.js')

    const req = { method: 'GET', query: { limit: '0' } }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid limit parameter' })
  })

  test('passes query params to supabase and returns result shape', async () => {
    const bookingsData = [{ id: 1 }]
    const query = createQuery({ data: bookingsData, error: null })
    const from = jest.fn(() => query)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/get-upcoming-bookings.js')

    const req = { method: 'GET', query: { limit: '3' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('bookings')
    expect(query.select).toHaveBeenCalledWith('*, salon_services(*)')
    expect(query.gte).toHaveBeenCalled()
    expect(query.lt).toHaveBeenCalled()
    expect(query.order).toHaveBeenCalledWith('appointment_date', { ascending: true })
    expect(query.limit).toHaveBeenCalledWith(3)

    const response = res.json.mock.calls[0][0]
    expect(response).toMatchObject({
      success: true,
      bookings: bookingsData,
      count: bookingsData.length
    })
    expect(typeof response.timestamp).toBe('string')
  })
})
