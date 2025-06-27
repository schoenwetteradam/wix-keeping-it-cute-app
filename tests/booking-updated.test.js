// tests for api/booking-updated.js
const createUpdateQuery = (result) => {
  const promise = Promise.resolve(result);
  promise.update = jest.fn(() => promise);
  promise.eq = jest.fn(() => promise);
  promise.select = jest.fn(() => promise);
  promise.single = jest.fn(() => promise);
  return promise;
};

const createRes = () => ({
  status: jest.fn(function(){ return this; }),
  json: jest.fn(function(){ return this; })
});

describe('booking-updated handler', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.SUPABASE_URL = 'http://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
  });

  test('parses webhook envelope and updates booking', async () => {
    const bookingQuery = createUpdateQuery({ data: { id: '1' }, error: null });
    const usageQuery = createUpdateQuery({ data: {}, error: null });
    const from = jest.fn((table) => {
      if (table === 'bookings') return bookingQuery;
      if (table === 'product_usage_sessions') return usageQuery;
      return createUpdateQuery({});
    });
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }));

    const { default: handler } = await import('../api/booking-updated.js');

    const req = {
      method: 'POST',
      body: {
        updatedEvent: {
          currentEntity: {
            id: '1',
            contactDetails: { email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
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
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'Booking updated successfully' }));
  });
});
