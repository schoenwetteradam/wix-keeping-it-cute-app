const createInsertQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.insert = jest.fn(() => promise)
  promise.select = jest.fn(() => promise)
  return promise
}

const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this })
})

describe('start-usage-session handler', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })

  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createInsertQuery({ data: [], error: null }))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))

    const { default: handler } = await import('../api/start-usage-session.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('inserts usage session and returns data', async () => {
    const insertQuery = createInsertQuery({ data: [{ id: 1 }], error: null })
    const from = jest.fn(() => insertQuery)
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))

    const { default: handler } = await import('../api/start-usage-session.js')

    const req = { method: 'POST', body: { booking_id: 'b1' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('product_usage_sessions')
    expect(insertQuery.insert).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'Usage session started successfully' }))
  })
})
