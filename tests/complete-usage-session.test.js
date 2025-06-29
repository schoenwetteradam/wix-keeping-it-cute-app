const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.single = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
  promise.update = jest.fn(() => promise)
  promise.insert = jest.fn(() => promise)
  return promise
}

const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this })
})

describe('complete-usage-session handler', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })

  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createQuery({ data: {}, error: null }))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/complete-usage-session.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('updates existing session and returns data', async () => {
    const query = createQuery({ data: { id: 1 }, error: null })
    const from = jest.fn(() => query)
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/complete-usage-session.js')

    const req = { method: 'POST', body: { booking_id: 'b1' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('product_usage_sessions')
    expect(query.update).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'Usage session completed successfully' }))
  })
})
