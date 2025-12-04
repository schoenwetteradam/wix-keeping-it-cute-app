import { withErrorHandler, APIError } from '../../../utils/errorHandler';
import { getWixAuthUrl } from '../../../lib/wix-auth';

const handler = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const returnUrl =
    req.body?.returnUrl || req.query?.returnUrl || req.headers.referer || '/dashboard';
  const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64');

  if (!process.env.NEXT_PUBLIC_WIX_CLIENT_ID || !process.env.NEXT_PUBLIC_WIX_REDIRECT_URI) {
    throw new APIError(
      'Missing Wix OAuth configuration',
      500,
      'WIX_CONFIG_ERROR',
      'Set NEXT_PUBLIC_WIX_CLIENT_ID and NEXT_PUBLIC_WIX_REDIRECT_URI env vars.'
    );
  }

  const authUrl = getWixAuthUrl(state);

  if (req.method === 'GET') {
    return res.redirect(authUrl);
  }

  return res.status(200).json({ success: true, redirectUrl: authUrl });
};

export default withErrorHandler(handler);
