
const { buildAppointmentsQuery } = require('../utils/appointments')

test('buildAppointmentsQuery returns query string with params', () => {
  const q = buildAppointmentsQuery({
    page: 2,
    limit: 10,
    status: 'confirmed',
    payment_status: 'paid',
    staff_member: 'Jane',
    start_date: '2024-01-01',
    end_date: '2024-01-31'
  })
  expect(q).toBe('page=2&limit=10&status=confirmed&payment_status=paid&staff_member=Jane&start_date=2024-01-01&end_date=2024-01-31')
})


const { clampPagination } = require('../utils/appointments');

describe('clampPagination', () => {
  test('returns positive integers for valid input', () => {
    expect(clampPagination('2', '10')).toEqual({ page: 2, limit: 10 });
  });

  test('clamps zero or negative values', () => {
    expect(clampPagination('0', '0')).toEqual({ page: 1, limit: 50 });
    expect(clampPagination('-3', '-5')).toEqual({ page: 1, limit: 50 });
  });

  test('handles non-numeric values', () => {
    expect(clampPagination('abc', 'xyz')).toEqual({ page: 1, limit: 50 });
  });
});

