import { useRouter } from 'next/router'

export default function StaffNavBar({ activeTab, setActiveTab, branding }) {
  const router = useRouter()
  const current = router.pathname

  const menuButtonStyle = {
    padding: '15px 25px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'normal',
    borderBottom: 'none',
    textTransform: 'capitalize'
  }

  const activeStyle = {
    backgroundColor: branding?.primary_color || '#ff9a9e',
    color: 'white',
    fontWeight: 'bold',
    borderBottom: `3px solid ${branding?.primary_color || '#ff9a9e'}`
  }

  const buttons = [
    { label: '📦 inventory', tab: 'inventory', path: '/staff' },
    { label: '✨ services', tab: 'services', path: '/staff' },
    { label: '📅 appointments', tab: 'appointments', path: '/staff' },
    { label: '🚨 alerts', tab: 'alerts', path: '/staff' },
    { label: '📋 All Products', path: '/all-products' },
    { label: '🛒 View Orders', path: '/orders' },
    { label: '👥 View Customers', path: '/customers' }
  ]

  const handleClick = (b) => {
    if (b.tab) {
      if (current !== '/staff') {
        router.push(`/staff?tab=${b.tab}`)
      } else {
        setActiveTab && setActiveTab(b.tab)
      }
    } else {
      router.push(b.path)
    }
  }

  const isActive = (b) => {
    if (b.tab) {
      return current === '/staff' && activeTab === b.tab
    }
    return current === b.path
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e9ecef',
      padding: '0 20px',
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
      {buttons.map(b => (
        <button
          key={b.label}
          onClick={() => handleClick(b)}
          style={{
            ...menuButtonStyle,
            ...(isActive(b) ? activeStyle : {})
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}

