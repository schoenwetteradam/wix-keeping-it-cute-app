/**
 * Wix Authentication Status
 * Returns the current Wix connection status and member data
 */

import cookie from 'cookie';
import { withErrorHandler, APIError } from '../../../utils/errorHandler';
import {
  getWixSession,
  hasValidWixConnection,
  getValidAccessToken
} from '../../../lib/wix-auth';
import { createSupabaseClient } from '../../../utils/supabaseClient';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
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

  if (!supabaseUserId) {
    return res.status(200).json({
      connected: false,
      reason: 'Not authenticated'
    });
  }

  try {
    const session = await getWixSession(supabaseUserId);

    if (!session) {
      return res.status(200).json({
        connected: false,
        reason: 'No Wix session'
      });
    }

    // Check if token is valid
    const hasValidConnection = await hasValidWixConnection(supabaseUserId);

    if (!hasValidConnection) {
      return res.status(200).json({
        connected: false,
        reason: 'Token expired or invalid'
      });
    }

    // Return connection status and member data
    return res.status(200).json({
      connected: true,
      memberId: session.wix_member_id,
      contactId: session.wix_contact_id,
      memberData: session.wix_member_data,
      connectedAt: session.created_at,
      lastUsed: session.last_used_at,
      expiresAt: session.expires_at
    });

  } catch (error) {
    console.error('Error checking Wix status:', error);
    return res.status(200).json({
      connected: false,
      reason: error.message
    });
  }
};

export default withErrorHandler(handler);
