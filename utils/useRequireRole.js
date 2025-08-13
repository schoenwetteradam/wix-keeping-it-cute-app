import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getBrowserSupabaseClient } from './supabaseBrowserClient'

/**
 * Hook to enforce role-based access.
 * Returns an `unauthorized` flag when the current user's role is not allowed.
 * Pages using this hook should check the flag and render a "Not authorized" screen.
 */
export default function useRequireRole(allowedRoles = []) {
  const router = useRouter()
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    const supabase = getBrowserSupabaseClient()

    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      const role = data?.role
      const allowed = allowedRoles.map(r => String(r).toLowerCase())
      const normalizedRole = String(role || '').toLowerCase()
      if (!allowed.includes(normalizedRole)) {
        setUnauthorized(true)
      } else {
        setUnauthorized(false)
      }
    }

    checkRole()
  }, [router, allowedRoles.join(',')])

  return unauthorized
}
