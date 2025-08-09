// pages/index.js - Simple redirect to staff portal
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import { PlusIcon } from '../components/icons'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/staff')
  }, [router])
  
  return (
    <>
      <Head>
        <title>Home - Keeping It Cute Salon</title>
      </Head>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <PlusIcon width={32} height={32} style={{ color: '#ff69b4' }} />
        <h1>Keeping It Cute Salon</h1>
        <Image
          src="/images/products/nail-care/glory.svg"
          alt="Decorative graphic"
          width={300}
          height={200}
          loading="lazy"
          style={{ margin: '20px auto' }}
        />
        <p>Redirecting to staff portal...</p>
      </div>
    </>
  )
}
