/**
 * Wix Authentication Logout
 * Invalidates the Wix session and clears cookies
 */

import cookie from 'cookie';
import { withErrorHandler, APIError } from '../../../utils/errorHandler';
import { invalidateWixSession } from '../../../lib/wix-auth';
import { createSupabaseClient } from '../../../utils/supabaseClient';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const supabase = createSupabaseClient();

  // Get authenticated user
  const authHeader = req.headers.authorization;
  let supabaseUserId = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!authError && user) {
      supabaseUserId = user.id;
    }
  }

  // Also check cookies
  if (!supabaseUserId) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const supabaseToken = cookies['sb-access-token'];
    if (supabaseToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(supabaseToken);
      if (!authError && user) {
        supabaseUserId = user.id;
      }
    }
  }

  // Invalidate session in database
  if (supabaseUserId) {
    try {
      await invalidateWixSession(supabaseUserId);
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  // Clear cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0 // Delete cookie
  };

  res.setHeader('Set-Cookie', [
    cookie.serialize('wix_access_token', '', cookieOptions),
    cookie.serialize('wix_connected', '', { ...cookieOptions, httpOnly: false }),
    cookie.serialize('wix_member_id', '', { ...cookieOptions, httpOnly: false }),
    cookie.serialize('wix_token', '', cookieOptions) // Clear old cookie format
  ]);

  return res.status(200).json({
    success: true,
    message: 'Wix session logged out'
  });
};

export default withErrorHandler(handler);
