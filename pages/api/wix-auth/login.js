import { withErrorHandler, APIError } from '../../../utils/errorHandler';
import { getConfiguredScopes } from '../../../lib/wix-auth';

const handler = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const clientId = process.env.WIX_CLIENT_ID || process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  const envRedirectUri = process.env.WIX_REDIRECT_URI || process.env.NEXT_PUBLIC_WIX_REDIRECT_URI;

  const protocolHeader = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : protocolHeader || 'https';
  const host = req.headers.host;
  const fallbackRedirectUri = host ? `${protocol}://${host}/api/wix-auth/callback` : null;
  const redirectUri = envRedirectUri || fallbackRedirectUri;

  if (!clientId || !redirectUri) {
    throw new APIError(
      'Missing Wix OAuth configuration',
      500,
      'WIX_CONFIG_ERROR',
      'Set WIX_CLIENT_ID and WIX_REDIRECT_URI (or NEXT_PUBLIC_WIX_REDIRECT_URI) env vars.'
    );
  }

  const returnUrl =
    req.body?.returnUrl || req.query?.returnUrl || req.headers.referer || '/dashboard';
  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64');

  const scopes = getConfiguredScopes().join(' ');

  const authUrl =
    `https://www.wix.com/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${encodeURIComponent(state)}`;

  if (req.method === 'GET') {
    return res.redirect(authUrl);
  }

  return res.status(200).json({
    success: true,
    authUrl,
    redirectUrl: authUrl
  });
};

export default withErrorHandler(handler);
