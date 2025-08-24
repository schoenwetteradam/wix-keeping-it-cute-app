// pages/customers.js - list customers with search/sort/filter and modal view
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { toPlainString } from '../utils/translation'
import { fetchWithAuth } from '../utils/api'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('newest') // newest, oldest, name-asc, name-desc
  const [selectedLabel, setSelectedLabel] = useState('all')

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [loyaltyRecord, setLoyaltyRecord] = useState(null)

  useEffect(() => {
    loadCustomers()
  }, [sortOption])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      setError(null)

      let sort_by = 'created_at'
      let sort_order = 'desc'
      if (sortOption === 'oldest') {
        sort_by = 'created_at'
        sort_order = 'asc'
      } else if (sortOption === 'name-asc') {
        sort_by = 'first_name'
        sort_order = 'asc'
      } else if (sortOption === 'name-desc') {
        sort_by = 'first_name'
        sort_order = 'desc'
      }

      const res = await fetchWithAuth(`/api/get-customers?limit=100&sort_by=${sort_by}&sort_order=${sort_order}`)
      if (!res.ok) throw new Error('Failed to load customers')
      const data = await res.json()
      const normalized = (data.customers || []).map(c => ({
        ...c,
        first_name: toPlainString(c.first_name),
        last_name: toPlainString(c.last_name),
        email: toPlainString(c.email),
        phone: toPlainString(c.phone),
        address: c.address && typeof c.address === 'object'
          ? {
              ...c.address,
              addressLine1: toPlainString(c.address.addressLine1),
              city: toPlainString(c.address.city),
              region: toPlainString(c.address.region),
              postalCode: toPlainString(c.address.postalCode),
              country: toPlainString(c.address.country)
            }
          : c.address
      }))
      setCustomers(normalized)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const uniqueLabels = Array.from(
    new Set(
      customers.flatMap(c => Array.isArray(c.labels) ? c.labels : []).filter(Boolean)
    )
  )

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (c.first_name || '').toLowerCase().includes(term) ||
      (c.last_name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    const matchesLabel = selectedLabel === 'all' || (c.labels || []).includes(selectedLabel)
    return matchesSearch && matchesLabel
  })

  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer)
    setShowDetails(true)
    setLoyaltyRecord(null)
    try {
      const res = await fetchWithAuth(`/api/get-loyalty?email=${encodeURIComponent(customer.email)}`)
      if (res.ok) {
        const data = await res.json()
        setLoyaltyRecord((data.loyalty || [])[0] || null)
      }
    } catch (err) {
      console.error('Failed to load loyalty', err)
    }
  }

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedCustomer(null)
    setLoyaltyRecord(null)
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading customers...</h1>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Customers - Keeping It Cute Salon</title>
      </Head>
      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>👥 Customers</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push('/loyalty-dashboard')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              💎 Loyalty Dashboard
            </button>
            <button
              onClick={() => router.push('/staff')}
              style={{
                background: 'linear-gradient(135deg, #e0cdbb 0%, #eee4da 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ← Back to Staff
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: '2', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}
          />
          <select value={sortOption} onChange={e => setSortOption(e.target.value)} style={{ padding: '10px', borderRadius: '4px' }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
          {uniqueLabels.length > 0 && (
            <select value={selectedLabel} onChange={e => setSelectedLabel(e.target.value)} style={{ padding: '10px', borderRadius: '4px' }}>
              <option value="all">All Labels</option>
              {uniqueLabels.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          )}
          <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>Customers: {filteredCustomers.length}</span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '20px' }}>👥</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Customers Found</h3>
            <p style={{ color: '#888', fontSize: '0.9em' }}>
              Customers will appear here once they book appointments or make purchases.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {filteredCustomers.map(c => (
              <div
                key={c.id}
                onClick={() => handleCustomerClick(c)}
                style={{
                  background: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '1.2em' }}>
                      {c.first_name} {c.last_name}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '1em' }}>
                      📧 {c.email || 'No email'}
                    </p>
                    {c.phone && (
                      <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.95em' }}>
                        📱 {c.phone}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {c.created_at && (
                      <span style={{ fontSize: '0.9em', color: '#666' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    )}
                    {(c.labels && c.labels.length > 0) && (
                      <span style={{
                        background: '#e3f2fd',
                        color: '#1976d2',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75em',
                        fontWeight: 'bold'
                      }}>
                        {c.labels[0]}
                        {c.labels.length > 1 && ` +${c.labels.length - 1}`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                  marginTop: '15px',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '15px'
                }}>
                  <span style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75em',
                    fontWeight: 'bold'
                  }}>
                    📝 View Details
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showDetails && selectedCustomer && (
          <div
            className="customer-overlay"
            onClick={closeDetails}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
          >
            <div
              className="customer-modal"
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Customer Details</h2>
                <button
                  onClick={closeDetails}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '15px'
                }}>
                  <div><strong>Name:</strong> {selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                  <div><strong>Email:</strong> {selectedCustomer.email}</div>
                  {selectedCustomer.phone && (<div><strong>Phone:</strong> {selectedCustomer.phone}</div>)}
                  {selectedCustomer.labels && selectedCustomer.labels.length > 0 && (
                    <div><strong>Labels:</strong> {selectedCustomer.labels.join(', ')}</div>
                  )}
                </div>
              </div>
              {selectedCustomer.address && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 10px 0' }}>Address</h3>
                  <div style={{ marginLeft: '10px' }}>
                    {selectedCustomer.address.addressLine1 && <div>{selectedCustomer.address.addressLine1}</div>}
                    {selectedCustomer.address.city && <div>{selectedCustomer.address.city}</div>}
                    {selectedCustomer.address.region && <div>{selectedCustomer.address.region}</div>}
                    {selectedCustomer.address.postalCode && <div>{selectedCustomer.address.postalCode}</div>}
                    {selectedCustomer.address.country && <div>{selectedCustomer.address.country}</div>}
                  </div>
                </div>
              )}
              {loyaltyRecord && (
                <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 10px 0' }}>Loyalty Points</h3>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div>Balance: {loyaltyRecord.points_balance}</div>
                    <div>Redeemed: {loyaltyRecord.redeemed_points}</div>
                  </div>
                </div>
              )}
            </div>
            <style jsx>{`
              .customer-overlay {
                animation: fadeIn 0.3s ease forwards;
              }
              .customer-modal {
                animation: slideUp 0.3s ease forwards;
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
          </div>
        )}
      </div>
    </>
  )
}
