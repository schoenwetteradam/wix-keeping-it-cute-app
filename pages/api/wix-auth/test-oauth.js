/**
 * Test OAuth Configuration
 * This endpoint helps verify your Wix OAuth setup is correct
 */

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  const serverClientId = process.env.WIX_CLIENT_ID;
  const clientSecret = process.env.WIX_CLIENT_SECRET ? '***SET***' : 'MISSING';
  const redirectUri = process.env.NEXT_PUBLIC_WIX_REDIRECT_URI || process.env.WIX_REDIRECT_URI;

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const fallbackRedirectUri = host ? `${protocol}://${host}/api/wix-auth/callback` : null;

  const config = {
    clientId: {
      public: clientId || 'MISSING',
      server: serverClientId || 'MISSING',
      matches: clientId === serverClientId
    },
    clientSecret: clientSecret,
    redirectUri: {
      configured: redirectUri || 'MISSING',
      fallback: fallbackRedirectUri,
      resolved: redirectUri || fallbackRedirectUri
    },
    expectedInWix: redirectUri || fallbackRedirectUri,
    status: 'checking...'
  };

  // Determine status
  if (!clientId || !serverClientId) {
    config.status = '❌ MISSING: Client ID not set';
  } else if (!process.env.WIX_CLIENT_SECRET) {
    config.status = '❌ MISSING: Client Secret not set';
  } else if (clientId !== serverClientId) {
    config.status = '⚠️ WARNING: Client IDs do not match';
  } else if (!redirectUri && !fallbackRedirectUri) {
    config.status = '❌ MISSING: Redirect URI not set';
  } else {
    config.status = '✅ Configuration looks correct';
  }

  return res.status(200).json({
    message: 'Wix OAuth Configuration Check',
    config,
    instructions: {
      step1: 'Copy the "expectedInWix" value above',
      step2: 'Go to https://dev.wix.com/ → My Apps → [Your App] → OAuth',
      step3: 'Scroll to "Redirect URIs" section',
      step4: `Make sure this URL is in the list: ${config.expectedInWix}`,
      step5: 'If not, click "Add Redirect URI" and add it',
      step6: 'Save and try logging in again'
    }
  });
}

