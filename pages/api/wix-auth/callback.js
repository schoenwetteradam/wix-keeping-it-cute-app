/**
 * Wix OAuth Callback Handler
 * Handles the OAuth callback, exchanges code for tokens, and stores session
 */

import cookie from 'cookie';
import { withErrorHandler, APIError } from '../../../utils/errorHandler';
import {
  exchangeCodeForTokens,
  fetchWixMemberData,
  storeWixSession
} from '../../../lib/wix-auth';
import { createSupabaseClient } from '../../../utils/supabaseClient';

const handler = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  const code = req.query.code || req.body?.code;
  const state = req.query.state || req.body?.state;
  const error = req.query.error;

  // Handle OAuth errors
  if (error) {
    console.error('Wix OAuth error:', error);
    return res.redirect(`/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    throw new APIError('Missing authorization code', 400, 'MISSING_CODE');
  }

  try {
    // Parse state for return URL
    let returnUrl = '/dashboard';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        returnUrl = stateData.returnUrl || '/dashboard';
      } catch {
        console.warn('Could not parse state parameter');
      }
    }

    // Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    const tokens = await exchangeCodeForTokens(code);

    // Fetch member data
    console.log('Fetching Wix member data...');
    let memberData = null;
    try {
      memberData = await fetchWixMemberData(tokens.accessToken);
    } catch (memberError) {
      console.warn('Could not fetch member data:', memberError.message);
    }

    // Get or create Supabase user
    const supabase = createSupabaseClient();

    // Check if we have an authenticated Supabase user
    const authHeader = req.headers.authorization;
    let supabaseUserId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        supabaseUserId = user.id;
      }
    }

    // If no authenticated user, check cookies
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

    // If we have a Supabase user, store the session
    if (supabaseUserId) {
      await storeWixSession(supabaseUserId, tokens, memberData);
      console.log('Wix session stored for user:', supabaseUserId);
    }

    // Set secure cookie with Wix token for immediate use
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expiresIn || 3600
    };

    res.setHeader('Set-Cookie', [
      cookie.serialize('wix_access_token', tokens.accessToken, cookieOptions),
      cookie.serialize('wix_connected', 'true', {
        ...cookieOptions,
        httpOnly: false, // Allow frontend to check connection status
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    ]);

    // If member data available, also set member ID cookie
    if (memberData?.member?.id) {
      res.setHeader('Set-Cookie', [
        ...res.getHeader('Set-Cookie') || [],
        cookie.serialize('wix_member_id', memberData.member.id, {
          ...cookieOptions,
          httpOnly: false,
          maxAge: 60 * 60 * 24 * 30
        })
      ]);
    }

    // Redirect to return URL
    return res.redirect(returnUrl);

  } catch (error) {
    console.error('Wix OAuth callback error:', error);
    return res.redirect(`/login?error=${encodeURIComponent('Authentication failed')}`);
  }
};

export default withErrorHandler(handler);
