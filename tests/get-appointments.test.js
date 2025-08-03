// tests for api/get-appointments.js
const createQuery = (result) => {
  const promise = Promise.resolve(result);
  promise.select = jest.fn(() => promise);
  promise.order = jest.fn(() => promise);
  promise.range = jest.fn(() => promise);
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
  process.env.ADMIN_USER_IDS = 'admin1';
  process.env.ADMIN_EMAILS = '';
});

describe('get-appointments handler', () => {
  test('rejects non-positive page or limit', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }));
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'user1' })));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: '0', limit: '-1' } };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid page or limit parameter' });
  });

  test('rejects non-numeric page or limit', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }));
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'user1' })));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: 'abc', limit: 'ten' } };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid page or limit parameter' });
  });

  test('applies range based on page and limit', async () => {
    const query = createQuery({ data: [], error: null });
    const from = jest.fn(() => query);
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'user1' })));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: '2', limit: '10' } };
    const res = createRes();

    await handler(req, res);

    expect(query.range).toHaveBeenCalledWith(10, 19);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('filters to user appointments for non-admins', async () => {
    const query = createQuery({ data: [], error: null });
    const from = jest.fn(() => query);
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'user1' })));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: '1', limit: '10' } };
    const res = createRes();

    await handler(req, res);

    expect(query.eq).toHaveBeenCalledWith('staff_id', 'user1');
  });

  test('allows viewing all appointments when scope=all', async () => {
    const query = createQuery({ data: [], error: null });
    const from = jest.fn(() => query);
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'user1' })));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: '1', limit: '10', scope: 'all' } };
    const res = createRes();

    await handler(req, res);

    expect(query.eq).not.toHaveBeenCalledWith('staff_id', 'user1');
  });

  test('admin can filter to their own appointments with scope=mine', async () => {
    const query = createQuery({ data: [], error: null });
    const from = jest.fn(() => query);
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'admin1' })));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: '1', limit: '10', scope: 'mine' } };
    const res = createRes();

    await handler(req, res);

    expect(query.eq).toHaveBeenCalledWith('staff_id', 'admin1');
  });

  test('allows admin emails to view all appointments', async () => {
    process.env.ADMIN_EMAILS = 'boss@example.com';
    const query = createQuery({ data: [], error: null });
    const from = jest.fn(() => query);
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));
    jest.doMock('../utils/requireAuth', () => jest.fn(() => Promise.resolve({ id: 'user1', email: 'boss@example.com' })));

    const { default: handler } = await import('../api/get-appointments.js');

    const req = { method: 'GET', query: { page: '1', limit: '10', scope: 'all' } };
    const res = createRes();

    await handler(req, res);

    expect(query.eq).not.toHaveBeenCalledWith('staff_id', 'user1');
  });

});
