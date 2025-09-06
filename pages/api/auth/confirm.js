import createClient from '../../../utils/supabase/api'
import { withErrorHandler, APIError } from '../../../utils/errorHandler'

function stringOrFirstString(item) {
  return Array.isArray(item) ? item[0] : item
}

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    throw new APIError('Method not allowed', 405, 'METHOD_NOT_ALLOWED')
  }

  const token_hash = stringOrFirstString(req.query.token_hash)
  const type = stringOrFirstString(req.query.type)

  if (!token_hash || !type) {
    throw new APIError('Missing token or type', 400, 'INVALID_REQUEST')
  }

  const supabase = createClient(req, res)
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type // 'email', 'recovery', 'invite', 'email_change', etc.
  })

  if (error) {
    throw new APIError('Invalid or expired token', 400, 'INVALID_TOKEN')
  }

  const next = stringOrFirstString(req.query.next) || '/'
  res.redirect(next)
}

export default withErrorHandler(handler)
