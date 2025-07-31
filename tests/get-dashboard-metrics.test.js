const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this })
})

describe('get-dashboard-metrics handler', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
    process.env.ADMIN_USER_IDS = 'admin1,admin2'
  })

  test('returns 405 on non-GET requests', async () => {
    const rpc = jest.fn(() => Promise.resolve({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ rpc }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'u1' })))

    const { default: handler } = await import('../api/get-dashboard-metrics.js')

    const req = { method: 'POST', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })

  test('non-admin cannot override staff_id', async () => {
    const rpc = jest.fn(() => Promise.resolve({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ rpc }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'user1' })))

    const { default: handler } = await import('../api/get-dashboard-metrics.js')

    const req = { method: 'GET', query: { staff_id: 'other' } }
    const res = createRes()

    await handler(req, res)

    expect(rpc).toHaveBeenCalledWith('dashboard_metrics', { p_staff_id: 'user1' })
    expect(rpc).toHaveBeenCalledWith('total_revenue_for_user', { user_id: 'user1' })
    expect(rpc).toHaveBeenCalledWith('total_appointments_for_user', { user_id: 'user1' })
    expect(rpc).toHaveBeenCalledWith('upcoming_appointments', { user_id: 'user1' })
  })

  test('admin can request metrics for all staff', async () => {
    const rpc = jest.fn(() => Promise.resolve({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ rpc }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'admin1' })))

    const { default: handler } = await import('../api/get-dashboard-metrics.js')

    const req = { method: 'GET', query: { staff_id: '' } }
    const res = createRes()

    await handler(req, res)

    expect(rpc).toHaveBeenCalledWith('dashboard_metrics', { p_staff_id: null })
    expect(rpc).toHaveBeenCalledWith('total_revenue_for_user', { user_id: 'admin1' })
    expect(rpc).toHaveBeenCalledWith('total_appointments_for_user', { user_id: 'admin1' })
    expect(rpc).toHaveBeenCalledWith('upcoming_appointments', { user_id: 'admin1' })
  })
})
