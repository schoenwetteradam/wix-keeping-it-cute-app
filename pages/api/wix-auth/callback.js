export async function GET(req) {
  console.log("ENV CHECK", {
    hasClientId: !!process.env.WIX_CLIENT_ID,
    hasSecret: !!process.env.WIX_CLIENT_SECRET,
    redirect: process.env.WIX_REDIRECT_URI,
  });

  return new Response("env check", { status: 200 });
}

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
    const protocolHeader = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(protocolHeader)
      ? protocolHeader[0]
      : protocolHeader || 'https';
    const host = req.headers.host;
    const fallbackRedirectUri = host
      ? `${protocol}://${host}/api/wix-auth/callback`
      : null;

    // Log OAuth callback details for debugging
    console.log('OAuth callback received:', {
      hasCode: !!code,
      hasState: !!state,
      host,
      protocol,
      fallbackRedirectUri,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });

    const tokens = await exchangeCodeForTokens(code, fallbackRedirectUri);

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
    console.error('Wix OAuth callback error:', {
      message: error.message,
      stack: error.stack,
      code: req.query.code ? 'present' : 'missing',
      state: req.query.state || 'missing',
      host: req.headers.host
    });
    
    // Provide more specific error messages
    const errorMessage = error.message.includes('redirect URI') 
      ? 'Redirect URI mismatch - verify configuration'
      : error.message.includes('Missing Wix OAuth')
      ? 'OAuth configuration error - check environment variables'
      : 'Authentication failed';
      
    return res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
  }
};

export default withErrorHandler(handler);
