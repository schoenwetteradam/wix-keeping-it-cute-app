import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function useRequireWixAuth() {
  const router = useRouter()

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )wix_token=([^;]*)/)
    const token = match ? decodeURIComponent(match[1]) : null
    if (!token) {
      router.replace('/login')
    }
  }, [router])
}
