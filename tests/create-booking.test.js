const createInsert = (result) => {
  const promise = Promise.resolve(result)
  promise.insert = jest.fn(() => promise)
  promise.select = jest.fn(() => promise)
  promise.single = jest.fn(() => promise)
  return promise
}

const createRes = () => ({
  status: jest.fn(function () { return this }),
  json: jest.fn(function () { return this }),
  end: jest.fn(function () { return this })
})

beforeEach(() => {
  jest.resetModules()
  process.env.SUPABASE_URL = 'http://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  global.fetch = jest.fn()
})

afterEach(() => {
  delete global.fetch
})

describe('create-booking handler', () => {
  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createInsert({ data: {}, error: null }))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/create-booking.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('validates required fields', async () => {
    const from = jest.fn(() => createInsert({ data: {}, error: null }))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/create-booking.js')

    const req = { method: 'POST', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    )
  })

  test('calls wix API and inserts booking', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ booking: { id: '123' } })
    })

    const insertQuery = createInsert({ data: { id: '1' }, error: null })
    const from = jest.fn(() => insertQuery)
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/create-booking.js')

    const reqBody = {
      serviceId: 'svc1',
      slot: { startDate: '2024-01-01T10:00:00Z', endDate: '2024-01-01T11:00:00Z' },
      contactDetails: { email: 'a@b.com', firstName: 'A', lastName: 'B' }
    }
    const req = { method: 'POST', body: reqBody }
    const res = createRes()

    await handler(req, res)

    expect(fetch).toHaveBeenCalledWith(
      'https://www.wixapis.com/_api/bookings-service/v2/bookings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(reqBody)
      })
    )
    expect(from).toHaveBeenCalledWith('bookings')
    expect(insertQuery.insert).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
