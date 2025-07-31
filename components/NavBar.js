import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import { fetchWithAuth } from '../utils/api'
import styles from './NavBar.module.css'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const router = useRouter()

  // Close menus on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setOpen(false)
      setToolsOpen(false)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const supabase = createClient(url, key)
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchWithAuth('/api/profile')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setProfile(data?.profile || null))
      .catch(() => {})
  }, [user])

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>Keeping It Cute</div>
      <button
        className={styles.toggle}
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        &#9776;
      </button>
      <div className={`${styles.links} ${open ? styles.show : ''}`}>
        <Link href="/staff" className={styles.tab}>
          🏠 Dashboard
        </Link>
        <Link href="/dashboard" className={styles.tab}>
          📈 Metrics
        </Link>
        <Link href="/staff?tab=appointments" className={styles.tab}>
          📅 Appointments
        </Link>
        <Link href="/all-products" className={styles.tab}>
          📦 Inventory
        </Link>
        <Link href="/orders" className={styles.tab}>
          🛒 Orders
        </Link>
        <Link href="/customers" className={styles.tab}>
          👥 Contacts
        </Link>
        <Link href="/staff-chat" className={styles.tab}>
          💬 Chat
        </Link>
        <div className={styles.tools}>
          <button
            className={styles.tab}
            onClick={() => setToolsOpen(!toolsOpen)}
            aria-haspopup="true"
            aria-expanded={toolsOpen}
          >
            Tools ▾
          </button>
          <div className={`${styles.dropdown} ${toolsOpen ? styles.show : ''}`}>
            <Link href="/all-products" className={styles.action}>
              📋 All Products
            </Link>
            <Link href="/inventory-audit" className={styles.action}>
              📊 Start Inventory Audit
            </Link>
            <Link href="/logo-management" className={`${styles.action} ${styles.beige}`}>
              🎨 Manage Logo
            </Link>
            <Link href="/upload-product-images" className={`${styles.action} ${styles.green}`}>
              📸 Upload Images
            </Link>
        <Link href="/loyalty-dashboard" className={styles.action}>
          💎 Loyalty Points
        </Link>
      </div>
    </div>
        <div className={styles.right}>
          {user && (
            <>
              <img
                src={profile?.avatar_url || '/images/avatar-placeholder.svg'}
                alt="avatar"
                className={styles.avatar}
              />
              <span className={styles.user}>{user.email}</span>
              <Link href="/profile" className={styles.tab}>
                Profile
              </Link>
              <button onClick={async () => {
                const url = process.env.NEXT_PUBLIC_SUPABASE_URL
                const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                if (url && key) {
                  const supabase = createClient(url, key)
                  await supabase.auth.signOut()
                }
                router.push('/login')
              }} className={styles.tab}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
