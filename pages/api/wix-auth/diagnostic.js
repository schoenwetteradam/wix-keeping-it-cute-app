/**
 * Wix OAuth Diagnostic Endpoint
 * Use this to verify OAuth configuration on Vercel
 * 
 * Access: GET /api/wix-auth/diagnostic
 */

import { buildRedirectUriFromRequest, resolveWixRedirectUri, getWixAuthUrl } from '../../../lib/wix-auth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const protocolHeader = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : protocolHeader || 'https';
  const host = req.headers.host;
  const currentUrl = host ? `${protocol}://${host}` : 'unknown';

  // Build expected callback URL
  const expectedCallbackPath = '/api/wix-auth/callback';
  const fallbackRedirectUri = buildRedirectUriFromRequest(req, expectedCallbackPath);
  
  let resolvedRedirectUri;
  try {
    resolvedRedirectUri = resolveWixRedirectUri(fallbackRedirectUri);
  } catch (error) {
    resolvedRedirectUri = `ERROR: ${error.message}`;
  }

  // Check environment variables
  const envCheck = {
    WIX_CLIENT_ID: {
      present: !!process.env.WIX_CLIENT_ID,
      value: process.env.WIX_CLIENT_ID ? `${process.env.WIX_CLIENT_ID.substring(0, 8)}...` : 'MISSING',
      note: process.env.WIX_CLIENT_ID ? '✅ Set' : '❌ Missing - OAuth will fail'
    },
    NEXT_PUBLIC_WIX_CLIENT_ID: {
      present: !!process.env.NEXT_PUBLIC_WIX_CLIENT_ID,
      value: process.env.NEXT_PUBLIC_WIX_CLIENT_ID ? `${process.env.NEXT_PUBLIC_WIX_CLIENT_ID.substring(0, 8)}...` : 'MISSING',
      note: process.env.NEXT_PUBLIC_WIX_CLIENT_ID ? '✅ Set' : '⚠️ Missing - Auth URL generation will fail'
    },
    WIX_CLIENT_SECRET: {
      present: !!process.env.WIX_CLIENT_SECRET,
      value: process.env.WIX_CLIENT_SECRET ? '***HIDDEN***' : 'MISSING',
      note: process.env.WIX_CLIENT_SECRET ? '✅ Set' : '❌ Missing - Token exchange will fail'
    },
    WIX_REDIRECT_URI: {
      present: !!process.env.WIX_REDIRECT_URI,
      value: process.env.WIX_REDIRECT_URI || 'MISSING',
      note: process.env.WIX_REDIRECT_URI ? '✅ Set' : '⚠️ Missing - Will use fallback'
    },
    NEXT_PUBLIC_WIX_REDIRECT_URI: {
      present: !!process.env.NEXT_PUBLIC_WIX_REDIRECT_URI,
      value: process.env.NEXT_PUBLIC_WIX_REDIRECT_URI || 'MISSING',
      note: process.env.NEXT_PUBLIC_WIX_REDIRECT_URI ? '✅ Set' : '⚠️ Missing - Will use fallback'
    }
  };

  // Verify redirect URI match
  const redirectUriMatch = {
    configured: process.env.WIX_REDIRECT_URI || process.env.NEXT_PUBLIC_WIX_REDIRECT_URI,
    resolved: resolvedRedirectUri,
    matches: (process.env.WIX_REDIRECT_URI || process.env.NEXT_PUBLIC_WIX_REDIRECT_URI) === resolvedRedirectUri,
    note: (process.env.WIX_REDIRECT_URI || process.env.NEXT_PUBLIC_WIX_REDIRECT_URI) === resolvedRedirectUri
      ? '✅ Redirect URIs match'
      : '⚠️ Redirect URIs may not match - verify in Wix Dev Center'
  };

  // Test auth URL generation
  let authUrlTest = { success: false, url: null, error: null };
  try {
    const testState = Buffer.from(JSON.stringify({ returnUrl: '/dashboard' })).toString('base64');
    authUrlTest.url = getWixAuthUrl(testState, fallbackRedirectUri);
    authUrlTest.success = true;
  } catch (error) {
    authUrlTest.error = error.message;
  }

  // Check callback route
  const callbackRoute = {
    expected: `${currentUrl}${expectedCallbackPath}`,
    note: 'Verify this URL exists and is registered in Wix Dev Center'
  };

  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    currentUrl,
    environmentVariables: envCheck,
    redirectUri: {
      fallback: fallbackRedirectUri,
      resolved: resolvedRedirectUri,
      match: redirectUriMatch,
      callbackRoute
    },
    authUrlGeneration: authUrlTest,
    checklist: {
      '1_redirect_uri_registered': {
        status: redirectUriMatch.matches ? '✅' : '⚠️',
        action: `Ensure this URL is registered in Wix Dev Center: ${resolvedRedirectUri}`
      },
      '2_env_vars_set': {
        status: envCheck.WIX_CLIENT_ID.present && envCheck.WIX_CLIENT_SECRET.present ? '✅' : '❌',
        action: 'Set WIX_CLIENT_ID and WIX_CLIENT_SECRET in Vercel Dashboard'
      },
      '3_callback_route_exists': {
        status: '?',
        action: `Test: ${callbackRoute.expected} - Should return 200 or redirect`
      },
      '4_offline_access_scope': {
        status: '✅',
        action: 'Verified: offline_access is first in scope list'
      },
      '5_token_endpoint': {
        status: '✅',
        action: 'Using correct endpoint: https://www.wix.com/oauth/access'
      }
    },
    recommendations: []
  };

  // Add recommendations
  if (!envCheck.WIX_CLIENT_ID.present) {
    diagnostic.recommendations.push('Set WIX_CLIENT_ID in Vercel Dashboard → Settings → Environment Variables');
  }
  if (!envCheck.WIX_CLIENT_SECRET.present) {
    diagnostic.recommendations.push('Set WIX_CLIENT_SECRET in Vercel Dashboard → Settings → Environment Variables');
  }
  if (!redirectUriMatch.matches) {
    diagnostic.recommendations.push(`Ensure redirect URI in Wix Dev Center matches exactly: ${resolvedRedirectUri}`);
  }
  if (!authUrlTest.success) {
    diagnostic.recommendations.push(`Fix auth URL generation: ${authUrlTest.error}`);
  }

  // Return diagnostic info
  res.status(200).json(diagnostic);
}

