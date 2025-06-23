const requireAuth = require('../utils/requireAuth');

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn((token) => {
          if (token === 'valid-token') {
            return Promise.resolve({ data: { user: { id: '123' } }, error: null });
          }
          return Promise.resolve({ data: null, error: new Error('Invalid token') });
        })
      }
    }))
  };
});

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
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
    expect(req.user).toEqual({ id: '123' });
  });
});
