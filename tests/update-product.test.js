const createUpdate = (result) => {
  const promise = Promise.resolve(result)
  promise.update = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
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

describe('update-product handler', () => {
  test('returns 405 on non-PATCH requests', async () => {
    const from = jest.fn(() => createUpdate({ data: {}, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/update-product.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('validates required fields', async () => {
    const from = jest.fn(() => createUpdate({ data: {}, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/update-product.js')

    const req = { method: 'PATCH', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    )
  })

  test('calls wix API and updates product', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ product: { id: 'p1' } })
    })

    const updateQuery = createUpdate({ data: { id: '1' }, error: null })
    const from = jest.fn(() => updateQuery)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/update-product.js')

    const reqBody = { productId: 'p1', product: { name: 'New' } }
    const req = { method: 'PATCH', body: reqBody }
    const res = createRes()

    await handler(req, res)

    expect(fetch).toHaveBeenCalledWith(
      'https://www.wixapis.com/stores/v1/products/p1',
      expect.objectContaining({ method: 'PATCH', body: expect.any(String) })
    )
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toEqual({ product: { name: 'New' } })
    expect(from).toHaveBeenCalledWith('products')
    expect(updateQuery.update).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
