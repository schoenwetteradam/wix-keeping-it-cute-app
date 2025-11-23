/**
 * Wix Authentication Library
 * Handles OAuth flow, token management, and member data fetching
 */

import { createSupabaseClient } from '../utils/supabaseClient';

const WIX_OAUTH_URL = 'https://www.wixapis.com/oauth/access';
const WIX_MEMBER_API = 'https://www.wixapis.com/members/v1/members';

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
    scope: 'offline_access'
  });

  if (state) {
    params.append('state', state);
  }

  return `https://www.wix.com/oauth/authorize?${params.toString()}`;
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
    const error = await response.text();
    console.error('Token exchange failed:', error);
    throw new Error(`Failed to exchange code: ${response.status}`);
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
