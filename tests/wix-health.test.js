const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.limit = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
  promise.gte = jest.fn(() => promise)
  return promise
}

const createRes = () => ({
  status: jest.fn(function () { return this }),
  json: jest.fn(function () { return this })
})

beforeEach(() => {
  jest.resetModules()
  process.env.SUPABASE_URL = 'http://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
})

describe('wix integration health handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/wixApiManager', () => ({ WixAPIManager: jest.fn(() => ({ getServices: jest.fn() })) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/health/wix-integration.js')

    const req = { method: 'POST' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('returns health data', async () => {
    const from = jest.fn(() => createQuery({ data: [{ count: 0 }], error: null }))
    const wixManager = { getServices: jest.fn(() => Promise.resolve({ services: [] })) }
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/wixApiManager', () => ({ WixAPIManager: jest.fn(() => wixManager) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/health/wix-integration.js')

    const req = { method: 'GET' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(wixManager.getServices).toHaveBeenCalled()
    const json = res.json.mock.calls[0][0]
    expect(json.status).toBeDefined()
  })
})
