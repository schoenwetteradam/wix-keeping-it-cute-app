import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function OAuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleOAuth = async () => {
      if (!router.isReady) return
      const { code } = router.query
      if (code) {
        try {
          const response = await fetch('/api/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          })
          const result = await response.json()
          if (result.success) {
            router.push('/dashboard')
          } else {
            console.error('OAuth error:', result.error)
          }
        } catch (err) {
          console.error('OAuth exchange failed', err)
        }
      }
    }
    handleOAuth()
  }, [router])

  return <p>Authenticating…</p>
}
