export function isAdmin(userId) {
  if (!userId) return false;
  const ids = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.includes(userId);
}
