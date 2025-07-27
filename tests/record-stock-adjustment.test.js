// tests for api/record-stock-adjustment.js
const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.insert = jest.fn(() => promise)
  promise.select = jest.fn(() => promise)
  promise.single = jest.fn(() => promise)
  promise.update = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
  return promise
}

const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this })
})

describe('record-stock-adjustment handler', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.SUPABASE_URL = 'http://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key'
  })

  test('returns 405 on non-POST requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))

    const { default: handler } = await import('../api/record-stock-adjustment.js')

    const req = { method: 'GET' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('inserts adjustment and updates product', async () => {
    const insertQuery = createQuery({ data: { id: 1 }, error: null })
    const selectQuery = createQuery({ data: { current_stock: 5 }, error: null })

    const from = jest.fn((table) => {
      if (table === 'stock_adjustments') return insertQuery
      if (table === 'products') return selectQuery
    })

    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))

    const { default: handler } = await import('../api/record-stock-adjustment.js')

    const req = { method: 'POST', body: { product_id: 'p1', quantity_change: 2, reason: 'fix', staff_id: 's1' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('stock_adjustments')
    expect(insertQuery.insert).toHaveBeenCalledWith({ product_id: 'p1', quantity_change: 2, reason: 'fix', staff_id: 's1' })
    expect(from).toHaveBeenCalledWith('products')
    expect(selectQuery.select).toHaveBeenCalledWith('current_stock')
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
