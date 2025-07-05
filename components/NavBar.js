import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './NavBar.module.css'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
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
        <Link href="/staff?tab=appointments" className={styles.tab}>
          📅 Appointments
        </Link>
        <Link href="/staff?tab=inventory" className={styles.tab}>
          📦 Inventory
        </Link>
        <Link href="/orders" className={styles.tab}>
          🛒 Orders
        </Link>
        <Link href="/customers" className={styles.tab}>
          👥 Contacts
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
      </div>
    </nav>
  )
}
