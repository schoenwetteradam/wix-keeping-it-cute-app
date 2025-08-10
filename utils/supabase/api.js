import { createServerClient, serializeCookieHeader } from '@supabase/ssr'

export default function createClient(req, res) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const source = req?.cookies || {}
          return Object.keys(source).map((name) => ({
            name,
            value: source[name] ?? '',
          }))
        },
        setAll(cookiesToSet) {
          if (!Array.isArray(cookiesToSet) || cookiesToSet.length === 0) return
          res.setHeader(
            'Set-Cookie',
            cookiesToSet.map(({ name, value, options }) =>
              serializeCookieHeader(name, value, options)
            )
          )
        },
      },
    }
  )
}
