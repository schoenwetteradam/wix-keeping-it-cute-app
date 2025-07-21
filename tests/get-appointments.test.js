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
