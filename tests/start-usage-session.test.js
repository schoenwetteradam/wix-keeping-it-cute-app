// tests for api/start-usage-session.js
const createInsertQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.insert = jest.fn(() => promise)
  promise.select = jest.fn(() => promise)
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

describe('start-usage-session handler', () => {
  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createInsertQuery({ data: [], error: null }))
    const setCorsHeaders = jest.fn()
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders }))

    const { default: handler } = await import('../api/start-usage-session.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(setCorsHeaders).toHaveBeenCalledWith(res, 'POST')
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('handles OPTIONS requests', async () => {
    const from = jest.fn(() => createInsertQuery({ data: [], error: null }))
    const setCorsHeaders = jest.fn()
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders }))

    const { default: handler } = await import('../api/start-usage-session.js')

    const req = { method: 'OPTIONS' }
    const res = createRes()

    await handler(req, res)

    expect(setCorsHeaders).toHaveBeenCalledWith(res, 'POST')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.end).toHaveBeenCalled()
  })

  test('inserts session record and returns success', async () => {
    const insertQuery = createInsertQuery({ data: [{ id: 1 }], error: null })
    const from = jest.fn(() => insertQuery)
    const setCorsHeaders = jest.fn()
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders }))

    const { default: handler } = await import('../api/start-usage-session.js')

    const reqBody = {
      booking_id: 'b1',
      staff_member_id: 's1',
      service_performed: 'Cut',
      customer_email: 'a@b.com',
      customer_name: 'Alice',
      session_notes: '',
      total_service_cost: 10
    }

    const req = { method: 'POST', body: reqBody }
    const res = createRes()

    await handler(req, res)

    expect(setCorsHeaders).toHaveBeenCalledWith(res, 'POST')
    expect(from).toHaveBeenCalledWith('product_usage_sessions')
    expect(insertQuery.insert).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    const response = res.json.mock.calls[0][0]
    expect(response).toMatchObject({ status: 'Usage session started successfully' })
  })
})
