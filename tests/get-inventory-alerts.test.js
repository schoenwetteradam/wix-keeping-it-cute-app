const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this })
})

describe('get-inventory-alerts handler', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })

  test('returns 405 on non-GET requests', async () => {
    const rpc = jest.fn(() => Promise.resolve({ data: [], error: null }))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/get-inventory-alerts.js')

    const req = { method: 'POST' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('fetches alerts and returns formatted response', async () => {
    const lowStock = [
      { id: '1', product_name: 'A', current_stock: 1, min_threshold: 5 },
      { id: '2', product_name: 'B', current_stock: 0, min_threshold: 2 }
    ]
    const rpc = jest.fn(() => Promise.resolve({ data: lowStock, error: null }))
    const addNotification = jest.fn(() => Promise.resolve())
    const loadNotifications = jest.fn(() => Promise.resolve([]))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    jest.doMock('../utils/notifications', () => ({ addNotification, loadNotifications }))

    const { default: handler } = await import('../api/get-inventory-alerts.js')

    const req = { method: 'GET' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    const json = res.json.mock.calls[0][0]
    expect(json.alerts.length).toBe(2)
    expect(json.alert_stats.total).toBe(2)
  })
})
