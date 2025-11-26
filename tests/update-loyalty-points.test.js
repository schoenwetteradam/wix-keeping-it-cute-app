// tests for api/update-loyalty-points.js
const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.update = jest.fn(() => promise)
  promise.single = jest.fn(() => promise)
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

describe('update-loyalty-points handler', () => {
  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createQuery({ data: {}, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/update-loyalty-points.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('updates loyalty record and returns result', async () => {
    const selectQuery = createQuery({ data: { id: '1', points_balance: 10, redeemed_points: 0 }, error: null })
    const updateQuery = createQuery({ data: { id: '1', points_balance: 15, redeemed_points: 0 }, error: null })
    const from = jest.fn()
      .mockReturnValueOnce(selectQuery)
      .mockReturnValueOnce(updateQuery)

    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/update-loyalty-points.js')

    const req = { method: 'POST', body: { loyalty_id: '1', points: 5, action: 'add' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('loyalty')
    expect(from).toHaveBeenCalledTimes(2)
    expect(selectQuery.select).toHaveBeenCalledWith('*')
    expect(selectQuery.eq).toHaveBeenCalledWith('id', '1')
    expect(updateQuery.update).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })
})
