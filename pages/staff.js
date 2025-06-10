// pages/staff.js - Staff Portal for Keeping It Cute Salon
import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function StaffPortal() {
  const [products, setProducts] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('Loading data...')
      
      // Test API endpoint
      const response = await fetch('/api/get-products')
      console.log('API Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API Data:', data)
      
      setProducts(data.products || [])
      
      // Filter for low stock alerts (current_stock <= min_threshold)
      const lowStockProducts = (data.products || []).filter(
        product => product.current_stock <= product.min_threshold
      )
      setAlerts(lowStockProducts)
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Keeping It Cute Salon - Staff Portal</h1>
        <p>Loading inventory data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Keeping It Cute Salon - Staff Portal</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={loadData}>Retry</button>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Staff Portal - Keeping It Cute Salon & Spa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <header style={{ 
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          color: 'white'
        }}>
          <h1 style={{ margin: 0, fontSize: '2.5em' }}>💅 Keeping It Cute</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '1.2em' }}>Staff Portal - Inventory Management</p>
          <p style={{ margin: '5px 0 0 0' }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </header>

        {/* Stats Summary */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            background: '#e3f2fd', 
            padding: '20px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Total Products</h3>
            <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold' }}>{products.length}</p>
          </div>
          
          <div style={{ 
            background: '#fff3e0', 
            padding: '20px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>Low Stock Alerts</h3>
            <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold', color: '#d32f2f' }}>
              {alerts.length}
            </p>
          </div>
          
          <div style={{ 
            background: '#e8f5e8', 
            padding: '20px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>Madam Glam Products</h3>
            <p style={{ fontSize: '2em', margin: 0, fontWeight: 'bold' }}>
              {products.filter(p => p.brand === 'Madam Glam').length}
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {alerts.length > 0 && (
          <div style={{ 
            background: '#ffebee', 
            border: '1px solid #f44336', 
            borderRadius: '8px', 
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#d32f2f', margin: '0 0 15px 0' }}>
              🚨 Low Stock Alerts ({alerts.length})
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '10px'
            }}>
              {alerts.map((product) => (
                <div key={product.id} style={{ 
                  background: 'white', 
                  padding: '15px', 
                  borderRadius: '5px',
                  border: '1px solid #ffcdd2'
                }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{product.product_name}</h4>
                  <p style={{ margin: '0 0 5px 0', color: '#666' }}>{product.brand}</p>
                  <p style={{ margin: 0, color: '#d32f2f', fontWeight: 'bold' }}>
                    Stock: {product.current_stock} / Min: {product.min_threshold}
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#666' }}>
                    Location: {product.location}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products by Category */}
        <div style={{ marginBottom: '20px' }}>
          <h2>📦 Product Inventory</h2>
          
          {['Nail Products', 'Nail Care', 'Nail Tools', 'Nail Supplies'].map(category => {
            const categoryProducts = products.filter(p => p.category === category)
            if (categoryProducts.length === 0) return null
            
            return (
              <div key={category} style={{ marginBottom: '20px' }}>
                <h3 style={{ 
                  background: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '5px',
                  margin: '0 0 10px 0'
                }}>
                  {category} ({categoryProducts.length})
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                  gap: '10px'
                }}>
                  {categoryProducts.slice(0, 20).map((product) => (
                    <div key={product.id} style={{ 
                      background: 'white', 
                      border: '1px solid #ddd', 
                      borderRadius: '5px',
                      padding: '15px'
                    }}>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '1em' }}>
                        {product.product_name}
                      </h4>
                      <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em' }}>
                        {product.brand} - {product.size} {product.unit_type}
                      </p>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9em' }}>
                        Stock: <strong>{product.current_stock}</strong> | 
                        Min: {product.min_threshold} | 
                        ${product.cost_per_unit}
                      </p>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.8em', 
                        color: product.current_stock <= product.min_threshold ? '#d32f2f' : '#388e3c'
                      }}>
                        {product.current_stock <= product.min_threshold ? 'LOW STOCK' : 'IN STOCK'}
                      </p>
                    </div>
                  ))}
                </div>
                
                {categoryProducts.length > 20 && (
                  <p style={{ textAlign: 'center', margin: '10px 0', color: '#666' }}>
                    Showing 20 of {categoryProducts.length} products
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <footer style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666',
          borderTop: '1px solid #eee',
          marginTop: '40px'
        }}>
          <p>Keeping It Cute Salon & Spa - Inventory Management System</p>
          <p>Last updated: {new Date().toLocaleString()}</p>
        </footer>
      </div>
    </>
  )
}
