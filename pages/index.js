// pages/index.js - Simple redirect to staff portal
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/staff')
  }, [router])
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Keeping It Cute Salon</h1>
      <p>Redirecting to staff portal...</p>
    </div>
  )
}
