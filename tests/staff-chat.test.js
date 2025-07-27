const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.order = jest.fn(() => promise)
  promise.limit = jest.fn(() => promise)
  promise.insert = jest.fn(() => promise)
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

describe('staff-chat handler', () => {
  test('returns 405 on unsupported method', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/staff-chat.js')

    const req = { method: 'PUT' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('fetches messages on GET', async () => {
    const query = createQuery({ data: [{ id: '1', content: 'hi' }], error: null })
    const from = jest.fn(() => query)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/staff-chat.js')

    const req = { method: 'GET' }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('staff_chat_messages')
    expect(query.select).toHaveBeenCalledWith('*')
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(query.limit).toHaveBeenCalledWith(50)

    const response = res.json.mock.calls[0][0]
    expect(response).toEqual({ messages: [{ id: '1', content: 'hi' }] })
  })

  test('inserts message on POST', async () => {
    const query = createQuery({ data: { id: '1', content: 'hi' }, error: null })
    const from = jest.fn(() => query)
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'u1' })))

    const { default: handler } = await import('../api/staff-chat.js')

    const req = { method: 'POST', body: { content: 'hi', username: 'me', avatar_url: 'a' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('staff_chat_messages')
    expect(query.insert).toHaveBeenCalledWith({
      content: 'hi',
      username: 'me',
      user_id: 'u1',
      avatar_url: 'a'
    })
    expect(query.select).toHaveBeenCalled()
    expect(query.single).toHaveBeenCalled()
    const response = res.json.mock.calls[0][0]
    expect(response).toEqual({ message: { id: '1', content: 'hi' } })
  })
})
