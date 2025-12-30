/**
 * Wix Authentication Library
 * Handles OAuth flow, token management, and member data fetching
 */

import { createSupabaseClient } from '../utils/supabaseClient';

// Wix OAuth token endpoint - MUST use wix.com, not wixapis.com
const WIX_OAUTH_URL = 'https://www.wix.com/oauth/access';
const WIX_MEMBER_API = 'https://www.wixapis.com/members/v1/members';

/**
 * Normalize redirect URI by removing trailing slashes and ensuring proper format
 */
function normalizeRedirectUri(url) {
  let pathname = url.pathname;
  // Remove trailing slash (Wix is strict about this)
  if (pathname.endsWith('/') && pathname !== '/') {
    pathname = pathname.slice(0, -1);
  }
  return `${url.origin}${pathname}`;
}

/**
 * Safely parse redirect URI string to URL object
 */
function safelyParseRedirectUri(redirectUri) {
  try {
    return new URL(redirectUri);
  } catch (error) {
    console.warn(
      'Invalid Wix redirect URI configuration; using fallback redirect URI instead.',
      error
    );
    return null;
  }
}

/**
 * Resolve Wix OAuth redirect URI with strict validation
 * Wix requires EXACT byte-for-byte match, so we validate carefully
 */
export function resolveWixRedirectUri(fallbackRedirectUri = null) {
  const publicUri = process.env.NEXT_PUBLIC_WIX_REDIRECT_URI;
  const serverUri = process.env.WIX_REDIRECT_URI;

  if (publicUri && serverUri && publicUri !== serverUri) {
    console.warn(
      'WIX_REDIRECT_URI and NEXT_PUBLIC_WIX_REDIRECT_URI do not match; using NEXT_PUBLIC_WIX_REDIRECT_URI for token exchange.'
    );
  }

  const configuredRedirectUri = publicUri || serverUri;
  const configuredUrl = configuredRedirectUri ? safelyParseRedirectUri(configuredRedirectUri) : null;
  const fallbackUrl = fallbackRedirectUri ? safelyParseRedirectUri(fallbackRedirectUri) : null;

  if (configuredUrl && fallbackUrl) {
    const configuredValue = normalizeRedirectUri(configuredUrl);
    const fallbackValue = normalizeRedirectUri(fallbackUrl);

    // Ensure HTTPS in production
    if (process.env.NODE_ENV === 'production' && configuredUrl.protocol !== 'https:') {
      console.error(`WARNING: Redirect URI uses ${configuredUrl.protocol} in production. Wix requires HTTPS.`);
    }

    if (configuredValue !== fallbackValue) {
      console.warn(
        `Configured Wix redirect URI (${configuredValue}) does not match current host (${fallbackValue}); using fallback to prevent invalid OAuth redirects.`
      );
      return fallbackUrl.toString().replace(/\/$/, ''); // Remove trailing slash
    }

    return configuredUrl.toString().replace(/\/$/, ''); // Remove trailing slash
  }

  if (configuredUrl) {
    // Ensure HTTPS in production
    if (process.env.NODE_ENV === 'production' && configuredUrl.protocol !== 'https:') {
      console.error(`WARNING: Redirect URI uses ${configuredUrl.protocol} in production. Wix requires HTTPS.`);
    }
    return configuredUrl.toString().replace(/\/$/, ''); // Remove trailing slash
  }

  if (!fallbackUrl) {
    throw new Error('Missing Wix OAuth redirect URI configuration. Set WIX_REDIRECT_URI or NEXT_PUBLIC_WIX_REDIRECT_URI in environment variables.');
  }

  return fallbackUrl.toString().replace(/\/$/, ''); // Remove trailing slash
}

export function buildRedirectUriFromRequest(req, path = '/api/wix-auth/callback') {
  const protocolHeader = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : protocolHeader || 'https';
  const host = req.headers.host;

  return host ? `${protocol}://${host}${path}` : null;
}

/**
 * Wix OAuth Scopes for full API access
 * These scopes grant comprehensive access to the Wix website and its APIs
 * NOTE: offline_access MUST be first for refresh tokens
 */
const DEFAULT_WIX_OAUTH_SCOPES = [
  // Core access - MUST be first for refresh tokens
  'offline_access',

  // Bookings & Services
  'wix.bookings.read_bookings',
  'wix.bookings.manage_bookings',
  'wix.bookings.read_services',
  'wix.bookings.manage_services',
  'wix.bookings.read_staff',
  'wix.bookings.manage_staff',
  'wix.bookings.read_resources',
  'wix.bookings.manage_resources',
  'wix.bookings.read_sessions',
  'wix.bookings.manage_sessions',
  'wix.bookings.read_schedule',
  'wix.bookings.manage_schedule',
  'wix.bookings.read_categories',
  'wix.bookings.manage_categories',

  // Contacts & CRM
  'wix.contacts.read',
  'wix.contacts.manage',
  'wix.crm.read',
  'wix.crm.manage',

  // E-commerce & Stores
  'wix.stores.read_products',
  'wix.stores.manage_products',
  'wix.stores.read_orders',
  'wix.stores.manage_orders',
  'wix.stores.read_inventory',
  'wix.stores.manage_inventory',
  'wix.stores.read_collections',
  'wix.stores.manage_collections',
  'wix.ecom.read_orders',
  'wix.ecom.manage_orders',
  'wix.ecom.read_checkouts',
  'wix.ecom.manage_checkouts',
  'wix.ecom.read_carts',
  'wix.ecom.manage_carts',

  // Members & Site
  'wix.members.read',
  'wix.members.manage',
  'wix.site.read',
  'wix.site.manage',

  // Events & Calendar
  'wix.events.read',
  'wix.events.manage',
  'wix.calendar.read',
  'wix.calendar.manage',

  // Loyalty & Marketing
  'wix.loyalty.read',
  'wix.loyalty.manage',
  'wix.marketing.read',
  'wix.marketing.manage',

  // Payments & Pricing
  'wix.payments.read',
  'wix.payments.manage',
  'wix.pricing_plans.read',
  'wix.pricing_plans.manage',

  // Notifications & Messaging
  'wix.notifications.send',
  'wix.inbox.read',
  'wix.inbox.manage',

  // Analytics & Reporting
  'wix.analytics.read',

  // Forms & Submissions
  'wix.forms.read',
  'wix.forms.manage'
];

function normalizeScopeList(scopeValue) {
  if (!scopeValue) {
    return [];
  }

  return scopeValue
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function resolveWixScopes() {
  const envScopes = normalizeScopeList(
    process.env.NEXT_PUBLIC_WIX_OAUTH_SCOPES || process.env.WIX_OAUTH_SCOPES
  );

  if (envScopes.length > 0) {
    // Ensure offline_access is first if not already present
    if (!envScopes.includes('offline_access')) {
      return ['offline_access', ...envScopes];
    }
    // Move offline_access to first if it's not already
    const offlineIndex = envScopes.indexOf('offline_access');
    if (offlineIndex > 0) {
      const scopes = [...envScopes];
      scopes.splice(offlineIndex, 1);
      return ['offline_access', ...scopes];
    }
    return envScopes;
  }

  if (process.env.NEXT_PUBLIC_WIX_OAUTH_SCOPES || process.env.WIX_OAUTH_SCOPES) {
    console.warn('Wix OAuth scopes env var is set but empty; falling back to defaults.');
  }

  return DEFAULT_WIX_OAUTH_SCOPES;
}

/**
 * Generate Wix OAuth authorization URL
 */
export function getWixAuthUrl(state = null, fallbackRedirectUri = null) {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  const redirectUri = resolveWixRedirectUri(fallbackRedirectUri);
  const scopes = resolveWixScopes();

  if (!clientId || !redirectUri) {
    throw new Error('Missing Wix OAuth configuration');
  }

  if (scopes.length === 0) {
    throw new Error('Missing Wix OAuth scopes');
  }

  // Build URL manually to ensure proper encoding (Wix requires %20 for spaces, not +)
  // URLSearchParams.toString() encodes spaces as + which Wix rejects
  const scopeString = scopes.join(' ');
  
  // Manually encode all parameters to ensure %20 for spaces
  const params = [
    `client_id=${encodeURIComponent(clientId)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `response_type=${encodeURIComponent('code')}`,
    `scope=${encodeURIComponent(scopeString)}`
  ];
  
  if (state) {
    params.push(`state=${encodeURIComponent(state)}`);
  }
  
  return `https://www.wix.com/oauth/authorize?${params.join('&')}`;
}

/**
 * Get list of configured OAuth scopes
 */
export function getConfiguredScopes() {
  return resolveWixScopes();
}

/**
 * Exchange authorization code for tokens
 * CRITICAL: Uses https://www.wix.com/oauth/access (not wixapis.com)
 */
export async function exchangeCodeForTokens(code, fallbackRedirectUri = null) {
  const clientId = process.env.WIX_CLIENT_ID;
  const clientSecret = process.env.WIX_CLIENT_SECRET;
  const redirectUri = resolveWixRedirectUri(fallbackRedirectUri);

  if (!clientId || !clientSecret) {
    throw new Error('Missing Wix OAuth credentials. Set WIX_CLIENT_ID and WIX_CLIENT_SECRET in environment variables.');
  }

  if (!code) {
    throw new Error('Authorization code is required');
  }

  // Log for debugging (without sensitive data)
  console.log('Exchanging code for tokens:', {
    hasCode: !!code,
    redirectUri,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    endpoint: WIX_OAUTH_URL
  });

  const response = await fetch(WIX_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    let details = 'Token exchange failed';
    let errorCode = null;
    
    try {
      const errorBody = await response.json();
      details = errorBody.error_description || errorBody.error || errorBody.message || details;
      errorCode = errorBody.error;
    } catch (parseError) {
      const fallback = await response.text();
      details = fallback || details;
    }

    const requestId = response.headers.get('x-wix-request-id') || response.headers.get('x-request-id');
    
    // Enhanced error logging
    const errorInfo = {
      status: response.status,
      statusText: response.statusText,
      error: details,
      errorCode,
      requestId,
      redirectUri,
      endpoint: WIX_OAUTH_URL
    };
    
    console.error('Token exchange failed:', errorInfo);

    // Provide helpful error messages
    if (response.status === 400 && errorCode === 'invalid_grant') {
      details = `Invalid grant - likely redirect URI mismatch. Expected: ${redirectUri}. Verify this exact URL is registered in Wix Dev Center.`;
    } else if (response.status === 401) {
      details = 'Authentication failed - check WIX_CLIENT_ID and WIX_CLIENT_SECRET';
    }

    if (requestId) {
      details = `${details} (Request ID: ${requestId})`;
    }

    throw new Error(`Failed to exchange code: ${response.status} - ${details}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Token exchange succeeded but no access_token in response');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'Bearer',
    expiresIn: data.expires_in,
    scope: data.scope
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.WIX_CLIENT_ID;
  const clientSecret = process.env.WIX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Wix OAuth credentials');
  }

  const response = await fetch(WIX_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenType: data.token_type || 'Bearer',
    expiresIn: data.expires_in,
    scope: data.scope
  };
}

/**
 * Fetch Wix member data using access token
 */
export async function fetchWixMemberData(accessToken) {
  const response = await fetch(`${WIX_MEMBER_API}/my`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    // Try alternate endpoint
    const altResponse = await fetch('https://www.wixapis.com/members/v1/members/current', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!altResponse.ok) {
      console.warn('Could not fetch member data');
      return null;
    }

    return altResponse.json();
  }

  return response.json();
}

/**
 * Store Wix auth session in database
 */
export async function storeWixSession(supabaseUserId, tokens, memberData = null) {
  const supabase = createSupabaseClient();

  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    : null;

  const sessionData = {
    supabase_user_id: supabaseUserId,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: tokens.tokenType,
    expires_at: expiresAt,
    scope: tokens.scope,
    wix_member_id: memberData?.member?.id || null,
    wix_contact_id: memberData?.member?.contactId || null,
    wix_member_data: memberData,
    is_active: true,
    last_used_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('wix_auth_sessions')
    .upsert(sessionData, {
      onConflict: 'supabase_user_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to store Wix session:', error);
    throw new Error(`Failed to store session: ${error.message}`);
  }

  return data;
}

/**
 * Get Wix session for user
 */
export async function getWixSession(supabaseUserId) {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('wix_auth_sessions')
    .select('*')
    .eq('supabase_user_id', supabaseUserId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No session found
    }
    console.error('Failed to get Wix session:', error);
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return data;
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getValidAccessToken(supabaseUserId) {
  const session = await getWixSession(supabaseUserId);

  if (!session) {
    return null;
  }

  // Check if token is expired or expiring soon (within 5 minutes)
  const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired && session.refresh_token) {
    try {
      const newTokens = await refreshAccessToken(session.refresh_token);
      await storeWixSession(supabaseUserId, newTokens, session.wix_member_data);

      // Update last_used_at
      const supabase = createSupabaseClient();
      await supabase
        .from('wix_auth_sessions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('supabase_user_id', supabaseUserId);

      return newTokens.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Invalidate session
      await invalidateWixSession(supabaseUserId);
      return null;
    }
  }

  // Update last_used_at
  const supabase = createSupabaseClient();
  await supabase
    .from('wix_auth_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('supabase_user_id', supabaseUserId);

  return session.access_token;
}

/**
 * Invalidate Wix session
 */
export async function invalidateWixSession(supabaseUserId) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('wix_auth_sessions')
    .update({ is_active: false })
    .eq('supabase_user_id', supabaseUserId);

  if (error) {
    console.error('Failed to invalidate session:', error);
    throw new Error(`Failed to invalidate session: ${error.message}`);
  }

  return true;
}

/**
 * Check if user has valid Wix connection
 */
export async function hasValidWixConnection(supabaseUserId) {
  const token = await getValidAccessToken(supabaseUserId);
  return !!token;
}

/**
 * Make authenticated Wix API request
 */
export async function makeWixApiRequest(supabaseUserId, endpoint, options = {}) {
  const accessToken = await getValidAccessToken(supabaseUserId);

  if (!accessToken) {
    throw new Error('No valid Wix access token');
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://www.wixapis.com${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Wix API error: ${response.status} - ${error}`);
  }

  return response.json();
}
