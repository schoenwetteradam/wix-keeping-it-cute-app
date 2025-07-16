const createQuery = (result) => {
  const promise = Promise.resolve(result);
  promise.insert = jest.fn(() => promise);
  promise.update = jest.fn(() => promise);
  promise.upsert = jest.fn(() => promise);
  promise.eq = jest.fn(() => promise);
  promise.select = jest.fn(() => promise);
  promise.maybeSingle = jest.fn(() => promise);
  return promise;
};

const createRes = () => ({
  status: jest.fn(function(){ return this; }),
  json: jest.fn(function(){ return this; })
});

describe('webhook-router payment status updated', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.SUPABASE_URL = 'http://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
  });

  test('upserts order with new and previous payment status', async () => {
    const logsQuery = createQuery({ data: {}, error: null });
    const orderQuery = createQuery({ data: [{ id: '1', wix_order_id: 'o1' }], error: null });
    const from = jest.fn((table) => {
      if (table === 'webhook_logs') return logsQuery;
      if (table === 'orders') return orderQuery;
      return createQuery({ data: {}, error: null });
    });
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({ setCorsHeaders: jest.fn() }));

    const { default: handler } = await import('../api/webhook-router.js');

    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        entityFqdn: 'wix.ecom.v1.order',
        slug: 'payment_status_updated',
        actionEvent: {
          body: {
            order: {
              id: 'o1',
              number: '100',
              paymentStatus: 'PAID'
            },
            previousPaymentStatus: 'NOT_PAID'
          }
        }
      }
    };
    const res = createRes();

    await handler(req, res);

    expect(from).toHaveBeenCalledWith('orders');
    expect(orderQuery.upsert).toHaveBeenCalled();
    const upsertData = orderQuery.upsert.mock.calls[0][0];
    expect(upsertData.payment_status).toBe('PAID');
    expect(upsertData.previous_payment_status).toBe('NOT_PAID');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
