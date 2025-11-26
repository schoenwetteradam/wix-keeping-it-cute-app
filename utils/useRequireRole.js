// utils/useRequireRole.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getBrowserSupabaseClient } from './supabaseBrowserClient'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

const ALLOWED_STAFF_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_STAFF_DOMAINS || 'keepingitcute.com,wix.com')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)

export default function useRequireRole(allowedRoles = []) {
  const router = useRouter()
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    const supabase = getBrowserSupabaseClient()

    async function checkRole() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.replace('/login')
        return
      }

      const userEmail = user.email?.toLowerCase() || ''
      const domain = userEmail.split('@')[1]
      if (!domain || !ALLOWED_STAFF_DOMAINS.includes(domain)) {
        setUnauthorized(true)
        router.replace('/login?reason=staff_only')
        return
      }

      // Check if user is an admin via email
      const isAdminByEmail = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        setUnauthorized(true)
        return
      }

      const normalizedRole = profile?.role?.toLowerCase()

      const userRoles = []
      if (normalizedRole) {
        userRoles.push(normalizedRole)
        if (normalizedRole === 'admin') {
          userRoles.push('staff')
        }
      }
      if (isAdminByEmail && !userRoles.includes('admin')) {
        userRoles.push('admin', 'staff')
      }

      const hasRequiredRole = allowedRoles.length === 0 || allowedRoles.some(requiredRole =>
        userRoles.includes(requiredRole.toLowerCase())
      )

      if (!hasRequiredRole) {
        setUnauthorized(true)
        router.replace('/login?reason=staff_only')
      } else {
        setUnauthorized(false)
      }
    }

    checkRole()
  }, [router, allowedRoles.join(',')])

  return unauthorized
}
