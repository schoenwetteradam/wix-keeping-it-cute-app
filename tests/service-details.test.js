const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
  promise.single = jest.fn(() => promise)
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

describe('service detail handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: null, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/services/[id].js')

    const req = { method: 'POST', query: { id: '1' } }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('returns 400 when id missing', async () => {
    const from = jest.fn(() => createQuery({ data: null, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/services/[id].js')

    const req = { method: 'GET', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Service ID is required' })
  })

  test('handles supabase errors', async () => {
    const from = jest.fn((table) => {
      if (table === 'salon_services') {
        return createQuery({ data: null, error: new Error('fail') })
      }
      return createQuery({ data: [], error: null })
    })
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/services/[id].js')

    const req = { method: 'GET', query: { id: '1' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('salon_services')
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to fetch service' }))
  })

  test('returns 404 when service missing', async () => {
    const from = jest.fn((table) => createQuery({ data: null, error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/services/[id].js')

    const req = { method: 'GET', query: { id: '1' } }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Service not found' })
  })

  test('fetches service details', async () => {
    const serviceData = { id: '1', name: 'Cut' }
    const staffLinks = [{ staff: { id: 's1' } }]
    const resourceRows = [{ resource_name: 'chair' }]
    const productLinks = [{ product: { id: 'p1' } }]

    const from = jest.fn((table) => {
      switch (table) {
        case 'salon_services':
          return createQuery({ data: serviceData, error: null })
        case 'service_staff':
          return createQuery({ data: staffLinks, error: null })
        case 'service_resources':
          return createQuery({ data: resourceRows, error: null })
        case 'service_products':
          return createQuery({ data: productLinks, error: null })
        default:
          return createQuery({ data: [], error: null })
      }
    })
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/services/[id].js')

    const req = { method: 'GET', query: { id: '1' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('salon_services')
    expect(from).toHaveBeenCalledWith('service_staff')
    expect(from).toHaveBeenCalledWith('service_resources')
    expect(from).toHaveBeenCalledWith('service_products')

    const response = res.json.mock.calls[0][0]
    expect(response).toMatchObject({
      success: true,
      service: {
        id: '1',
        name: 'Cut',
        staff: [{ id: 's1' }],
        resources: ['chair'],
        products: [{ id: 'p1' }]
      }
    })
    expect(typeof response.timestamp).toBe('string')
  })
})
