function clampPagination(page = 1, limit = 50) {
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const safePage = Number.isFinite(p) && p >= 1 ? p : 1;
  const safeLimit = Number.isFinite(l) && l > 0 ? l : 50;
  return { page: safePage, limit: safeLimit };
}

module.exports = { clampPagination };
