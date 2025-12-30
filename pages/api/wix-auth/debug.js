/**
 * Wix OAuth Debug Endpoint
 * Helps diagnose OAuth configuration issues
 */

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const fallbackRedirectUri = host ? `${protocol}://${host}/api/wix-auth/callback` : null;

  const config = {
    environment: {
      clientId: {
        public: process.env.NEXT_PUBLIC_WIX_CLIENT_ID || '❌ MISSING',
        server: process.env.WIX_CLIENT_ID || '❌ MISSING',
        matches: process.env.NEXT_PUBLIC_WIX_CLIENT_ID === process.env.WIX_CLIENT_ID
      },
      clientSecret: process.env.WIX_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
      redirectUri: {
        public: process.env.NEXT_PUBLIC_WIX_REDIRECT_URI || '❌ NOT SET',
        server: process.env.WIX_REDIRECT_URI || '❌ NOT SET',
        fallback: fallbackRedirectUri || '❌ CANNOT DETERMINE'
      }
    },
    resolvedRedirectUri: process.env.NEXT_PUBLIC_WIX_REDIRECT_URI || 
                         process.env.WIX_REDIRECT_URI || 
                         fallbackRedirectUri || 
                         '❌ CANNOT RESOLVE',
    oauthUrl: null,
    issues: []
  };

  // Check for issues
  if (!process.env.NEXT_PUBLIC_WIX_CLIENT_ID) {
    config.issues.push('❌ NEXT_PUBLIC_WIX_CLIENT_ID is not set');
  }
  if (!process.env.WIX_CLIENT_ID) {
    config.issues.push('❌ WIX_CLIENT_ID is not set');
  }
  if (process.env.NEXT_PUBLIC_WIX_CLIENT_ID !== process.env.WIX_CLIENT_ID) {
    config.issues.push('⚠️ Client IDs do not match between NEXT_PUBLIC and server');
  }
  if (!process.env.WIX_CLIENT_SECRET) {
    config.issues.push('❌ WIX_CLIENT_SECRET is not set');
  }
  if (!config.resolvedRedirectUri || config.resolvedRedirectUri.includes('❌')) {
    config.issues.push('❌ Cannot resolve redirect URI');
  }

  // Generate OAuth URL for testing
  if (process.env.NEXT_PUBLIC_WIX_CLIENT_ID && config.resolvedRedirectUri && !config.resolvedRedirectUri.includes('❌')) {
    try {
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_WIX_CLIENT_ID,
        redirect_uri: config.resolvedRedirectUri,
        response_type: 'code',
        scope: 'offline_access' // Minimal scope for testing
      });
      config.oauthUrl = `https://www.wix.com/oauth/authorize?${params.toString()}`;
    } catch (error) {
      config.issues.push(`❌ Error generating OAuth URL: ${error.message}`);
    }
  }

  const instructions = {
    step1: 'Copy the "resolvedRedirectUri" value above',
    step2: 'Go to Wix Dev Center: https://dev.wix.com/ → My Apps → [Your App] → OAuth',
    step3: 'Scroll to "Custom authentication (legacy)" section',
    step4: `Make sure "Redirect URL" field contains EXACTLY: ${config.resolvedRedirectUri}`,
    step5: 'Click "Save" at the top right',
    step6: 'Wait 30 seconds, then try logging in again',
    troubleshooting: [
      'Verify redirect URI has NO trailing slash',
      'Verify redirect URI uses https:// (not http://)',
      'Verify redirect URI matches EXACTLY (case-sensitive)',
      'Clear browser cache and try again',
      'Try in incognito/private window'
    ]
  };

  return res.status(200).json({
    message: 'Wix OAuth Configuration Debug',
    config,
    instructions,
    testUrl: config.oauthUrl ? {
      url: config.oauthUrl,
      note: 'This is a test OAuth URL with minimal scopes. The actual login uses more scopes.'
    } : null
  });
}

