/**
 * Wix OAuth Login Initiation
 * GET: Returns the Wix OAuth authorization URL
 * POST: Redirects to Wix authorization
 */

import { withErrorHandler, APIError } from '../../../utils/errorHandler';
import { getWixAuthUrl } from '../../../lib/wix-auth';
import { createBrowserSupabaseClient } from '../../../utils/supabaseClient';

const handler = async (req, res) => {
  if (req.method === 'GET') {
    // Return the authorization URL for the frontend to use
    try {
      // Generate a state parameter for CSRF protection
      const state = Buffer.from(JSON.stringify({
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(7)
      })).toString('base64');

      const authUrl = getWixAuthUrl(state);

      return res.status(200).json({
        success: true,
        authUrl,
        state
      });
    } catch (error) {
      throw new APIError(error.message, 500, 'WIX_AUTH_CONFIG_ERROR');
    }
  }

  if (req.method === 'POST') {
    // Redirect directly to Wix authorization
    try {
      const { returnUrl } = req.body || {};

      const state = Buffer.from(JSON.stringify({
        timestamp: Date.now(),
        returnUrl: returnUrl || '/dashboard',
        random: Math.random().toString(36).substring(7)
      })).toString('base64');

      const authUrl = getWixAuthUrl(state);

      return res.status(200).json({
        success: true,
        redirectUrl: authUrl
      });
    } catch (error) {
      throw new APIError(error.message, 500, 'WIX_AUTH_CONFIG_ERROR');
    }
  }

  throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
};

export default withErrorHandler(handler);
