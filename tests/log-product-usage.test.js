// tests for api/log-product-usage.js
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

describe('log-product-usage handler', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })

  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createInsertQuery({ data: [], error: null }))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))

    const { default: handler } = await import('../api/log-product-usage.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('inserts product usage records and logs alerts', async () => {
    const insertQuery = createInsertQuery({
      data: [{ id: 1, product_id: 'p1', products: { product_name: 'Test', current_stock: 0, min_threshold: 2 } }],
      error: null
    })
    const from = jest.fn(() => insertQuery)
    const addNotification = jest.fn(() => Promise.resolve())
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/notifications', () => ({ addNotification }))

    const { default: handler } = await import('../api/log-product-usage.js')

    const req = {
      method: 'POST',
      body: { products: [{ usage_session_id: 's1', product_id: 'p1', booking_id: 'b1', quantity_used: 1 }] }
    }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('product_usage_log')
    expect(insertQuery.insert).toHaveBeenCalled()
    expect(addNotification).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
