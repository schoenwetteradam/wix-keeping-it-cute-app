import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getBrowserSupabaseClient } from './supabaseBrowserClient'

export default function useRequireRole(allowedRoles = []) {
  const router = useRouter()

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
        .single()
      const role = data?.role
      if (!allowedRoles.includes(role)) {
        router.replace('/staff')
      }
    }

    checkRole()
  }, [router, allowedRoles.join(',')])
}
