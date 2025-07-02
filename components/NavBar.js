import { useState } from 'react'
import Link from 'next/link'
import styles from './NavBar.module.css'

export default function NavBar() {
  const [open, setOpen] = useState(false)

  const navItems = [
    { href: '/staff?tab=inventory', label: '📦 Inventory' },
    { href: '/staff?tab=services', label: '✨ Services' },
    { href: '/staff?tab=appointments', label: '📅 Appointments' },
    { href: '/alerts', label: '🚨 Alerts' },
    { href: '/all-products', label: '📋 All Products' },
    { href: '/orders', label: '🛒 View Orders' },
    { href: '/customers', label: '👥 View Customers' },
    { href: '/loyalty-dashboard', label: '💎 Loyalty Points' },
    { href: '/inventory-audit', label: '📊 Start Inventory Audit' },
    { href: '/logo-management', label: '🎨 Manage Logo' },
    { href: '/upload-product-images', label: '📸 Upload Images' }
  ]

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
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
