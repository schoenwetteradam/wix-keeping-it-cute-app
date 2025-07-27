// tests for api/get-customers.js
const createQuery = (result) => {
  const promise = Promise.resolve(result);
  promise.select = jest.fn(() => promise);
  promise.limit = jest.fn(() => promise);
  promise.order = jest.fn(() => promise);
  promise.or = jest.fn(() => promise);
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

describe('get-customers handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }));
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));

    const { default: handler } = await import('../api/get-customers.js');

    const req = { method: 'POST', query: {} };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  test('passes query params to supabase and returns result shape', async () => {
    const customersData = [{ id: 1 }];
    const query = createQuery({ data: customersData, error: null });
    const from = jest.fn(() => query);
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));

    const { default: handler } = await import('../api/get-customers.js');

    const req = {
      method: 'GET',
      query: { limit: '5', search: 'john', sort_by: 'created_at', sort_order: 'asc' }
    };
    const res = createRes();

    await handler(req, res);

    expect(from).toHaveBeenCalledWith('contacts');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.or).toHaveBeenCalledWith('first_name.ilike.%john%,last_name.ilike.%john%,email.ilike.%john%');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true });

    const response = res.json.mock.calls[0][0];
    expect(response).toMatchObject({
      success: true,
      customers: customersData,
      count: customersData.length
    });
    expect(typeof response.timestamp).toBe('string');
  });
});
