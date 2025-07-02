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
        <Link href="/staff">Staff</Link>
        <Link href="/inventory-audit">Inventory</Link>
        <Link href="/services">Services</Link>
        <Link href="/alerts">Alerts</Link>
      </div>
    </nav>
  )
}
