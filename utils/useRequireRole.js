import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { fetchWithAuth } from './api'

export default function useRequireRole(allowedRoles = []) {
  const router = useRouter()

  useEffect(() => {
    async function checkRole() {
      try {
        const res = await fetchWithAuth('/api/profile')
        if (!res.ok) {
          router.replace('/login')
          return
        }
        const { profile } = await res.json()
        const role = profile?.role
        if (allowedRoles.length && (!role || !allowedRoles.includes(role))) {
          router.replace('/staff')
        }
      } catch (err) {
        console.error('Failed to verify user role', err)
        router.replace('/login')
      }
    }

    checkRole()
  }, [router, allowedRoles.join(',')])
}
