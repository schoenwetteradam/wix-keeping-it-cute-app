import { useRouter } from 'next/router'

export default function StaffNavBar({ branding, activeTab }) {
  const router = useRouter()
  const tabs = ['inventory', 'services', 'appointments', 'alerts', 'chat']

  const handleTabClick = (tab) => {
    if (tab === 'alerts') {
      router.push('/alerts')
      return
    }
    if (tab === 'chat') {
      router.push('/staff-chat')
      return
    }
    router.push({ pathname: '/staff', query: { tab } })
  }

  return (
    <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e9ecef', padding: '0 20px' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            style={{
              padding: '15px 25px',
              border: 'none',
              backgroundColor: activeTab === tab ? (branding?.primary_color || '#e0cdbb') : 'transparent',
              color: activeTab === tab ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              borderBottom: activeTab === tab ? `3px solid ${branding?.primary_color || '#e0cdbb'}` : 'none',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'inventory' && '📦'} {tab === 'services' && '✨'} {tab === 'appointments' && '📅'} {tab === 'alerts' && '🚨'} {tab === 'chat' && '💬'} {tab}
          </button>
        ))}
      </div>
    </div>
  )
}
