import createClient from '../../../utils/supabase/api'

function stringOrFirstString(item) {
  return Array.isArray(item) ? item[0] : item
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end()
    return
  }

  const token_hash = stringOrFirstString(req.query.token_hash)
  const type = stringOrFirstString(req.query.type)
  let next = '/error'

  if (token_hash && type) {
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })
    if (!error) {
      next = stringOrFirstString(req.query.next) || '/'
    }
  }

  res.redirect(next)
}
