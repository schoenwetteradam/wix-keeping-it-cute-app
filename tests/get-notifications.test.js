const createRes = () => ({
  status: jest.fn(function(){ return this }),
  json: jest.fn(function(){ return this })
})

describe('get-notifications handler', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('returns notifications list', async () => {
    const fakeNotifs = [{ id: '1', message: 'Test' }]
    jest.doMock('../utils/notifications', () => ({ loadNotifications: jest.fn(() => Promise.resolve(fakeNotifs)) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = require('../api/get-notifications.js')

    const req = { method: 'GET' }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, notifications: fakeNotifs, count: fakeNotifs.length })
  })
})
