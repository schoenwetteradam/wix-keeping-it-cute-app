export default function handler(req, res) {
  const clientId = process.env.WIX_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.WIX_REDIRECT_URI);

  const scopes = [
    'offline_access',
    'wix.bookings.read_bookings',
    'wix.contacts.read',
    'wix.stores.read_products'
  ].join(' ');

  const authUrl =
    `https://www.wix.com/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${encodeURIComponent(scopes)}`;

  res.redirect(authUrl);
}
