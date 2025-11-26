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

describe('create-product handler', () => {
  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createInsert({ data: {}, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/create-product.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('validates required fields', async () => {
    const from = jest.fn(() => createInsert({ data: {}, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/create-product.js')

    const req = { method: 'POST', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    )
  })

  test('calls wix API and inserts product', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ product: { id: 'p1' } })
    })

    const insertQuery = createInsert({ data: { id: '1' }, error: null })
    const from = jest.fn(() => insertQuery)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/create-product.js')

    const reqBody = { product_name: 'T-shirt', brand: 'Nice', category: 'Apparel' }
    const req = { method: 'POST', body: reqBody }
    const res = createRes()

    await handler(req, res)

    expect(fetch).toHaveBeenCalledWith(
      'https://www.wixapis.com/stores/v1/products',
      expect.objectContaining({ method: 'POST', body: expect.any(String) })
    )
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toEqual({
      product: {
        name: 'T-shirt',
        productType: 'physical',
        brand: 'Nice',
        category: 'Apparel'
      }
    })
    expect(from).toHaveBeenCalledWith('products')
    expect(insertQuery.insert).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
