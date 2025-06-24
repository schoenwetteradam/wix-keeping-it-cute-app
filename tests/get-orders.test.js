// tests for api/get-orders.js
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

describe('get-orders handler', () => {
  test('returns 405 on non-GET requests', async () => {
    const from = jest.fn(() => createQuery({ data: [], error: null }));
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));

    const { default: handler } = await import('../api/get-orders.js');

    const req = { method: 'POST', query: {} };
    const res = createRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  test('passes query params to supabase and returns result shape', async () => {
    const ordersData = [{ id: 1 }];
    const query = createQuery({ data: ordersData, error: null });
    const from = jest.fn(() => query);
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));

    const { default: handler } = await import('../api/get-orders.js');

    const req = {
      method: 'GET',
      query: { limit: '10', payment_status: 'paid', fulfillment_status: 'fulfilled' }
    };
    const res = createRes();

    await handler(req, res);

    expect(from).toHaveBeenCalledWith('orders');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.eq.mock.calls).toEqual(
      expect.arrayContaining([
        ['payment_status', 'paid'],
        ['fulfillment_status', 'fulfilled']
      ])
    );

    const response = res.json.mock.calls[0][0];
    expect(response).toMatchObject({
      success: true,
      orders: ordersData,
      count: ordersData.length
    });
    expect(typeof response.timestamp).toBe('string');
  });
});
