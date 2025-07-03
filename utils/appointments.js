
export function buildAppointmentsQuery({ page = 1, limit = 50, status, payment_status, staff_member, start_date, end_date } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.append('status', status)
  if (payment_status) params.append('payment_status', payment_status)
  if (staff_member) params.append('staff_member', staff_member)
  if (start_date) params.append('start_date', start_date)
  if (end_date) params.append('end_date', end_date)
  return params.toString()
}


function clampPagination(page = 1, limit = 50) {
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const safePage = Number.isFinite(p) && p >= 1 ? p : 1;
  const safeLimit = Number.isFinite(l) && l > 0 ? l : 50;
  return { page: safePage, limit: safeLimit };
}

module.exports = { clampPagination };

