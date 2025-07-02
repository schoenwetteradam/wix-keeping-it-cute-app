import { useState } from 'react'
import Link from 'next/link'
import styles from './NavBar.module.css'

export default function NavBar() {
  const [open, setOpen] = useState(false)

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
        <Link href="/staff?tab=inventory" className={styles.tab}>
          📦 Inventory
        </Link>
        <Link href="/staff?tab=services" className={styles.tab}>
          ✨ Services
        </Link>
        <Link href="/staff?tab=appointments" className={styles.tab}>
          📅 Appointments
        </Link>
        <Link href="/alerts" className={styles.tab}>
          🚨 Alerts
        </Link>
        <Link href="/all-products" className={styles.action}>
          📋 All Products
        </Link>
        <Link href="/orders" className={styles.action}>
          🛒 View Orders
        </Link>
        <Link href="/customers" className={`${styles.action} ${styles.beige}`}>
          👥 View Customers
        </Link>
        <Link href="/loyalty-dashboard" className={styles.action}>
          💎 Loyalty Points
        </Link>
        <div className={styles.right}>
          <Link href="/inventory-audit" className={styles.action}>
            📊 Start Inventory Audit
          </Link>
          <Link href="/logo-management" className={`${styles.action} ${styles.beige}`}>
            🎨 Manage Logo
          </Link>
          <Link href="/upload-product-images" className={`${styles.action} ${styles.green}`}>
            📸 Upload Images
          </Link>
        </div>
      </div>
    </nav>
  )
}
