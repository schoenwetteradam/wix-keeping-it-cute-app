beforeEach(() => {
  jest.resetModules()
  global.fetch = jest.fn(() => Promise.resolve({ status: 200 }))
  global.window = { location: { href: '' } }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
})

afterEach(() => {
  delete global.fetch
  delete global.window
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

test('includes Authorization header when session token available', async () => {
  jest.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } })
      }
    })
  }))
  const { fetchWithAuth } = require('../utils/api')
  await fetchWithAuth('/api/test')
  expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer token' })
  }))
})

test('redirects to login on 401 response', async () => {
  global.fetch.mockResolvedValue({ status: 401 })
  jest.doMock('@supabase/supabase-js', () => ({
    createClient: () => ({ auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) } })
  }))
  const { fetchWithAuth } = require('../utils/api')
  await fetchWithAuth('/api/test')
  expect(global.window.location.href).toBe('/login?reason=unauthorized')
})
