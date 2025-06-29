// pages/customers.js - list customers with search/sort/filter and modal view
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { toPlainString } from '../utils/translation'

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

      const res = await fetch(`/api/get-customers?limit=100&sort_by=${sort_by}&sort_order=${sort_order}`)
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

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer)
    setShowDetails(true)
  }

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedCustomer(null)
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

        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f1f1', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Phone</th>
                <th style={{ padding: '12px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.id} onClick={() => handleCustomerClick(c)} style={{ cursor: 'pointer', borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{c.first_name} {c.last_name}</td>
                  <td style={{ padding: '12px' }}>{c.email}</td>
                  <td style={{ padding: '12px' }}>{c.phone || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showDetails && selectedCustomer && (
          <div style={{
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
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Customer Details</h2>
                <button
                  onClick={closeDetails}
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <p><strong>Name:</strong> {selectedCustomer.first_name} {selectedCustomer.last_name}</p>
              <p><strong>Email:</strong> {selectedCustomer.email}</p>
              {selectedCustomer.phone && (<p><strong>Phone:</strong> {selectedCustomer.phone}</p>)}
              {selectedCustomer.labels && selectedCustomer.labels.length > 0 && (
                <p><strong>Labels:</strong> {selectedCustomer.labels.join(', ')}</p>
              )}
              {selectedCustomer.address && (
                <div>
                  <strong>Address:</strong>
                  <div style={{ marginLeft: '10px' }}>
                    {selectedCustomer.address.addressLine1 && <div>{selectedCustomer.address.addressLine1}</div>}
                    {selectedCustomer.address.city && <div>{selectedCustomer.address.city}</div>}
                    {selectedCustomer.address.region && <div>{selectedCustomer.address.region}</div>}
                    {selectedCustomer.address.postalCode && <div>{selectedCustomer.address.postalCode}</div>}
                    {selectedCustomer.address.country && <div>{selectedCustomer.address.country}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
