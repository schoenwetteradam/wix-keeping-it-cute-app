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


