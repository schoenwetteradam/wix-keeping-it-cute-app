// tests for api/webhook-router.js booking updated
const createQuery = (result) => {
  const promise = Promise.resolve(result);
  promise.insert = jest.fn(() => promise);
  promise.update = jest.fn(() => promise);
  promise.eq = jest.fn(() => promise);
  promise.select = jest.fn(() => promise);
  promise.maybeSingle = jest.fn(() => promise);
  return promise;
};

const createRes = () => ({
  status: jest.fn(function(){ return this; }),
  json: jest.fn(function(){ return this; })
});

describe('webhook-router booking updated', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.SUPABASE_URL = 'http://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
  });

  test('uses currentEntity when updating booking', async () => {
    const logsQuery = createQuery({ data: {}, error: null });
    const bookingQuery = createQuery({ data: { id: '10', wix_booking_id: '10' }, error: null });
    const from = jest.fn((table) => {
      if (table === 'webhook_logs') return logsQuery;
      if (table === 'bookings') return bookingQuery;
      return createQuery({ data: {}, error: null });
    });
    jest.doMock('../utils/supabaseClient', () => ({ createSupabaseClient: () => ({ from }) }));
    jest.doMock('../utils/cors', () => ({
      setCorsHeaders: jest.fn(),
      setWebhookCorsHeaders: jest.fn()
    }));

    const { default: handler } = require('../api/webhook-router.js');

    const req = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        entityFqdn: 'wix.bookings.v2.booking',
        slug: 'updated',
        entityId: '10',
        updatedEvent: {
          currentEntity: {
            id: '10',
            contactDetails: { email: 'a@b.com', firstName: 'A', lastName: 'B' },
            paymentStatus: 'PAID',
            status: 'CONFIRMED'
          }
        }
      }
    };
    const res = createRes();

    await handler(req, res);

    expect(from).toHaveBeenCalledWith('bookings');
    expect(bookingQuery.update).toHaveBeenCalled();
    expect(bookingQuery.eq).toHaveBeenCalledWith('wix_booking_id', '10');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
