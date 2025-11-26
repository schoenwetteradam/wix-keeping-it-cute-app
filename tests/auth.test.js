const requireAuth = require('../utils/requireAuth');

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn((token) => {
          if (token === 'valid-token') {
            return Promise.resolve({ data: { user: { id: '123', email: 'staff@keepingitcute.com' } }, error: null });
          }
          if (token === 'bad-domain') {
            return Promise.resolve({ data: { user: { id: '999', email: 'intruder@example.com' } }, error: null });
          }
          if (token === 'non-staff') {
            return Promise.resolve({ data: { user: { id: 'non-staff', email: 'guest@keepingitcute.com' } }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Invalid token') });
        })
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn((_, value) => ({
            single: jest.fn(() => Promise.resolve({ data: { role: value === 'non-staff' ? 'customer' : 'staff' }, error: null })),
            maybeSingle: jest.fn(() => Promise.resolve({ data: { role: value === 'non-staff' ? 'customer' : 'staff' }, error: null }))
          }))
        }))
      }))
    }))
  };
});

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    process.env.ALLOWED_STAFF_DOMAINS = 'keepingitcute.com';
  });

  it('sends 401 when Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = { statusCode: 0, end: jest.fn() };

    await requireAuth(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.end).toHaveBeenCalledWith('Unauthorized');
  });

  it('allows request with valid token', async () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = { statusCode: 0, end: jest.fn() };

    await requireAuth(req, res);

    expect(res.end).not.toHaveBeenCalled();
    expect(req.user).toEqual({ id: '123', email: 'staff@keepingitcute.com', role: 'staff' });
  });

  it('rejects requests from unauthorized domains', async () => {
    const req = { headers: { authorization: 'Bearer bad-domain' } };
    const res = { statusCode: 0, end: jest.fn() };

    await requireAuth(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.end).toHaveBeenCalledWith('Staff access required');
  });

  it('rejects requests when profile role is not staff', async () => {
    const req = { headers: { authorization: 'Bearer non-staff' } };
    const res = { statusCode: 0, end: jest.fn() };

    await requireAuth(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.end).toHaveBeenCalledWith('Staff access required');
  });
});
