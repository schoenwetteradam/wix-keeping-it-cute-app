/**
 * Wix Authentication Library
 * Handles OAuth flow, token management, and member data fetching
 */

import { createSupabaseClient } from '../utils/supabaseClient';

const WIX_OAUTH_URL = 'https://www.wixapis.com/oauth/access';
const WIX_MEMBER_API = 'https://www.wixapis.com/members/v1/members';

/**
 * Wix OAuth Scopes for full API access
 * These scopes grant comprehensive access to the Wix website and its APIs
 */
const WIX_OAUTH_SCOPES = [
  // Core access
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

/**
 * Generate Wix OAuth authorization URL
 */
export function getWixAuthUrl(state = null) {
  const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_WIX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Missing Wix OAuth configuration');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: WIX_OAUTH_SCOPES.join(' ')
  });

  if (state) {
    params.append('state', state);
  }

  return `https://www.wix.com/oauth/authorize?${params.toString()}`;
}

/**
 * Get list of configured OAuth scopes
 */
export function getConfiguredScopes() {
  return WIX_OAUTH_SCOPES;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code) {
  const clientId = process.env.WIX_CLIENT_ID;
  const clientSecret = process.env.WIX_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_WIX_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Wix OAuth credentials');
  }

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
    try {
      const errorBody = await response.json();
      details = errorBody.error_description || errorBody.message || details;
    } catch (parseError) {
      const fallback = await response.text();
      details = fallback || details;
    }

    const requestId = response.headers.get('x-wix-request-id') || response.headers.get('x-request-id');
    if (requestId) {
      details = `${details} (Request ID: ${requestId})`;
    }

    console.error('Token exchange failed:', details);
    throw new Error(`Failed to exchange code: ${response.status} - ${details}`);
  }

  const data = await response.json();

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
