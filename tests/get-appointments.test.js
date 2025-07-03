
const createQuery = (result) => {
  const promise = Promise.resolve(result)
  promise.select = jest.fn(() => promise)
  promise.order = jest.fn(() => promise)
  promise.range = jest.fn(() => promise)
  promise.eq = jest.fn(() => promise)
  promise.gte = jest.fn(() => promise)
  promise.lte = jest.fn(() => promise)
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

describe('get-appointments handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }))
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/get-appointments.js')

    const req = { method: 'POST', query: {} }
    const res = createRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
  })

  test('uses query params for pagination and filtering', async () => {
    const appointments = [{ id: 1 }]
    const query = createQuery({ data: appointments, error: null })
    const from = jest.fn(() => query)
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }))

    const { default: handler } = await import('../api/get-appointments.js')

    const req = { method: 'GET', query: { page: '2', limit: '10', status: 'confirmed', payment_status: 'paid', staff_member: 'Jane', start_date: '2024-01-01', end_date: '2024-01-31' } }
    const res = createRes()

    await handler(req, res)

    expect(from).toHaveBeenCalledWith('bookings')
    expect(query.select).toHaveBeenCalledWith('*, salon_services(*)')
    expect(query.order).toHaveBeenCalledWith('appointment_date', { ascending: false })
    expect(query.range).toHaveBeenCalledWith(10, 19)
    expect(query.eq.mock.calls).toEqual(expect.arrayContaining([
      ['status', 'confirmed'],
      ['payment_status', 'paid'],
      ['staff_member', 'Jane']
    ]))
    expect(query.gte).toHaveBeenCalledWith('appointment_date', '2024-01-01')
    expect(query.lte).toHaveBeenCalledWith('appointment_date', '2024-01-31')

    const response = res.json.mock.calls[0][0]
    expect(response).toMatchObject({ success: true, appointments, count: appointments.length })
    expect(typeof response.timestamp).toBe('string')
  })
})


// tests for api/get-appointments.js
const createQuery = (result) => {
  const promise = Promise.resolve(result);
  promise.select = jest.fn(() => promise);
  promise.order = jest.fn(() => promise);
  promise.limit = jest.fn(() => promise);
  promise.eq = jest.fn(() => promise);
  return promise;
};

const createRes = () => ({
  status: jest.fn(function(){ return this; }),
  json: jest.fn(function(){ return this; }),
  end: jest.fn(function(){ return this; })
});

beforeEach(() => {
  jest.resetModules();
  process.env.SUPABASE_URL = 'http://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
});

describe('get-appointments handler', () => {
  test('rejects non-positive page or limit', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }));
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: '0', limit: '-1' } };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid page or limit parameter' });
  });

  test('rejects non-numeric page or limit', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }));
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: 'abc', limit: 'ten' } };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid page or limit parameter' });
  });
});

