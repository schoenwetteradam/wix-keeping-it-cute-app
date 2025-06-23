// pages/product-usage-dashboard.js
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { fetchWithAuth } from '../utils/supabaseBrowserClient'

export default function ProductUsageDashboard() {
  const [usageSessions, setUsageSessions] = useState([])
  const [usageStats, setUsageStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week') // week, month, quarter

  useEffect(() => {
    loadUsageData()
  }, [dateRange])

  const loadUsageData = async () => {
    try {
      setLoading(true)
      
      // Load usage sessions
      const sessionsResponse = await fetchWithAuth(`/api/product-usage-stats?range=${dateRange}`)
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        setUsageSessions(sessionsData.sessions || [])
        setUsageStats(sessionsData.stats || {})
      }
      
    } catch (error) {
      console.error('Error loading usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading product usage data...</h1>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Product Usage Dashboard - Keeping It Cute Salon</title>
      </Head>

      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        backgroundColor: '#f8f9fa', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '30px',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '25px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: 0, fontSize: '2em' }}>📊 Product Usage Dashboard</h1>
          <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
            Track product consumption and optimize inventory
          </p>
        </div>

        {/* Date Range Selector */}
        <div style={{ 
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '25px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Time Period:</span>
            {['week', 'month', 'quarter'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: dateRange === range ? '#667eea' : '#f8f9fa',
                  color: dateRange === range ? 'white' : '#333',
                  textTransform: 'capitalize'
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Usage Stats */}
        {usageStats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px',
            marginBottom: '25px'
          }}>
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#667eea' }}>📦 Total Sessions</h3>
              <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>
                {usageStats.total_sessions || 0}
              </p>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>💰 Total Value Used</h3>
              <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>
                ${(usageStats.total_value || 0).toFixed(0)}
              </p>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>📉 Most Used Product</h3>
              <p style={{ fontSize: '1.2em', margin: 0, fontWeight: 'bold', color: '#333' }}>
                {usageStats.top_product || 'None'}
              </p>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>⚡ Avg. Products per Service</h3>
              <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>
                {(usageStats.avg_products_per_session || 0).toFixed(1)}
              </p>
            </div>
          </div>
        )}

        {/* Recent Usage Sessions */}
        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Recent Product Usage Sessions</h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px'
          }}>
            {usageSessions.map((session) => (
              <div key={session.id} style={{ 
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                    {session.customer_name}
                  </h4>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em' }}>
                    {session.service_performed}
                  </p>
                  <p style={{ margin: '0', color: '#888', fontSize: '0.8em' }}>
                    {new Date(session.session_start_time).toLocaleString()}
                  </p>
                </div>
                
                {session.products_used && (
                  <div>
                    <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>Products Used:</h5>
                    {session.products_used.map((product, index) => (
                      <div key={index} style={{ 
                        padding: '8px',
                        background: 'white',
                        borderRadius: '4px',
                        marginBottom: '5px',
                        fontSize: '0.9em'
                      }}>
                        <strong>{product.product_name}</strong> - {product.quantity_used} {product.unit_type}
                        {product.notes && (
                          <div style={{ color: '#666', fontSize: '0.8em', fontStyle: 'italic' }}>
                            {product.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ 
                  marginTop: '15px',
                  padding: '10px',
                  background: session.is_completed ? '#e8f5e8' : '#fff3e0',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  fontWeight: 'bold',
                  color: session.is_completed ? '#2e7d32' : '#f57c00'
                }}>
                  {session.is_completed ? '✅ Completed' : '⏳ In Progress'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
