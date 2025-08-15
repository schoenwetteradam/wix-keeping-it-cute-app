// utils/useRequireRole.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getBrowserSupabaseClient } from './supabaseBrowserClient'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

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

      // Check if user is an admin via email
      const isAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
      
      // For your salon system, everyone is considered 'staff' by default
      // Admins have both 'staff' and 'admin' roles
      const userRoles = isAdmin ? ['staff', 'admin'] : ['staff']
      
      // Check if user has any of the required roles
      const hasRequiredRole = allowedRoles.some(requiredRole => 
        userRoles.includes(requiredRole.toLowerCase())
      )

      if (!hasRequiredRole) {
        setUnauthorized(true)
      } else {
        setUnauthorized(false)
      }
    }

    checkRole()
  }, [router, allowedRoles.join(',')])

  return unauthorized
}
