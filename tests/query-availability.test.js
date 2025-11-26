// tests for api/query-availability.js

const createRes = () => ({
  setHeader: jest.fn(),
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

describe('query-availability handler', () => {
  test('returns 405 on non-POST requests', async () => {
    const { default: handler } = require('../api/query-availability.js')

    const req = { method: 'GET', body: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('validates serviceId in request body', async () => {
    const { default: handler } = require('../api/query-availability.js')

    const req = { method: 'POST', body: { query: { filter: {} } } }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('serviceId') })
    )
  })

  test('proxies wix response for valid data', async () => {
    global.fetch.mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({ ok: true })
    })

    const { default: handler } = require('../api/query-availability.js')

    const reqBody = { query: { filter: { serviceId: '123' } } }
    const req = { method: 'POST', body: reqBody }
    const res = createRes()

    await handler(req, res)

    expect(fetch).toHaveBeenCalledWith(
      'https://www.wixapis.com/_api/bookings-service/v2/availability/query',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(reqBody)
      })
    )

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})
