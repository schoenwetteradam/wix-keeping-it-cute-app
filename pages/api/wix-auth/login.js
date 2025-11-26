export default function handler(req, res) {
  const clientId = process.env.WIX_CLIENT_ID || process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  const envRedirectUri = process.env.WIX_REDIRECT_URI || process.env.NEXT_PUBLIC_WIX_REDIRECT_URI;

  const protocolHeader = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : protocolHeader || 'https';
  const host = req.headers.host;
  const fallbackRedirectUri = host ? `${protocol}://${host}/api/wix-oauth-callback` : null;
  const redirectUri = envRedirectUri || fallbackRedirectUri;

  if (!clientId || !redirectUri) {
    return res.status(500).json({
      error: 'Missing Wix OAuth configuration',
      details: 'Set WIX_CLIENT_ID and WIX_REDIRECT_URI (or NEXT_PUBLIC_WIX_REDIRECT_URI) env vars.'
    });
  }

  const encodedRedirectUri = encodeURIComponent(redirectUri);

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
    `&redirect_uri=${encodedRedirectUri}` +
    `&scope=${encodeURIComponent(scopes)}`;

  res.redirect(authUrl);
}
