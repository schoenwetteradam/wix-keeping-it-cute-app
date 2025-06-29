const createRes = () => ({
  status: jest.fn(function () { return this }),
  json: jest.fn(function () { return this }),
  end: jest.fn(function () { return this })
})

beforeEach(() => {
  jest.resetModules()
  global.fetch = jest.fn()
})

afterEach(() => {
  delete global.fetch
})

describe('create-checkout handler', () => {
  test('returns 405 on non-POST requests', async () => {
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    const { default: handler } = await import('../api/create-checkout.js')

    const req = { method: 'GET' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('validates lineItems', async () => {
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    const { default: handler } = await import('../api/create-checkout.js')

    const req = { method: 'POST', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    )
  })

  test('calls wix API and returns data', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'co-1' })
    })

    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    const { default: handler } = await import('../api/create-checkout.js')

    const reqBody = { lineItems: [{ catalogReference: { id: '1' } }] }
    const req = { method: 'POST', body: reqBody }
    const res = createRes()

    await handler(req, res)

    expect(fetch).toHaveBeenCalledWith(
      'https://www.wixapis.com/ecom/v1/checkout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(reqBody)
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, checkout: { id: 'co-1' } })
  })
})
