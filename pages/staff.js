// pages/staff.js - Fixed Staff Portal for Keeping It Cute Salon
import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function StaffPortal() {
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('inventory')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('Loading salon data...')
      setLoading(true)
      
      // Load products
      const productsResponse = await fetch('/api/get-products')
      if (!productsResponse.ok) {
        throw new Error(`Products API Error: ${productsResponse.status}`)
      }
      const productsData = await productsResponse.json()
      console.log('Products loaded:', productsData.total_count)
      
      // Load services
      const servicesResponse = await fetch('/api/services')
      if (!servicesResponse.ok) {
        throw new Error(`Services API Error: ${servicesResponse.status}`)
      }
      const servicesData = await servicesResponse.json()
      console.log('Services loaded:', servicesData.stats?.total_services)
      
      setProducts(productsData.products || [])
      setServices(servicesData.services || [])
      setAlerts(productsData.low_stock_alerts || [])
      setLoading(false)
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h1>💅 Keeping It Cute Salon - Staff Portal</h1>
        <div style={{ marginTop: '50px' }}>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Loading salon data...</div>
          <div style={{ display: 'inline-block', border: '4px solid #f3f3f3', borderTop: '4px solid #ff9a9e', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }}></div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h1>💅 Keeping It Cute Salon - Staff Portal</h1>
        <div style={{ marginTop: '50px', color: 'red' }}>
          <h2>⚠️ Error Loading Data</h2>
          <p>{error}</p>
          <button 
            onClick={loadData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff9a9e',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const productsByCategory = products.reduce((acc, product) => {
    const cat = product.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(product)
    return acc
  }, {})

  const servicesByCategory = services.reduce((acc, service) => {
    const cat = service.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(service)
    return acc
  }, {})

  return (
    <>
      <Head>
        <title>Staff Portal - Keeping It Cute Salon & Spa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* Header */}
        <header style={{ 
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          padding: '30px 20px',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: 0, fontSize: '2.5em', fontWeight: 'bold' }}>💅 Keeping It Cute</h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '1.3em', opacity: 0.9 }}>Staff Portal - Business Management</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '1em', opacity: 0.8 }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </header>

        {/* Navigation Tabs */}
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e9ecef', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {['inventory', 'services', 'alerts'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '15px 25px',
                  border: 'none',
                  backgroundColor: activeTab === tab ? '#ff9a9e' : 'transparent',
                  color: activeTab === tab ? 'white' : '#666',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  borderBottom: activeTab === tab ? '3px solid #ff9a9e' : 'none',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'inventory' && '📦'} {tab === 'services' && '✨'} {tab === 'alerts' && '🚨'} {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px' }}>
          {/* Stats Summary */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1976d2', fontSize: '1.1em' }}>📦 Total Products</h3>
              <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>{products.length}</p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9em' }}>Madam Glam Inventory</p>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#f57c00', fontSize: '1.1em' }}>🚨 Low Stock Alerts</h3>
              <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#d32f2f' }}>
                {alerts.length}
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9em' }}>Need Restocking</p>
            </div>
            
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#388e3c', fontSize: '1.1em' }}>✨ Active Services</h3>
              <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>
                {services.length}
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9em' }}>Hair, Nails, Skincare</p>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'alerts' && alerts.length > 0 && (
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '25px',
              marginBottom: '25px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '2px solid #ffcdd2'
            }}>
              <h2 style={{ color: '#d32f2f', margin: '0 0 20px 0', fontSize: '1.4em' }}>
                🚨 Urgent: Low Stock Alerts ({alerts.length})
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '15px'
              }}>
                {alerts.slice(0, 12).map((product) => (
                  <div key={product.id} style={{ 
                    background: '#fff3e0', 
                    padding: '20px', 
                    borderRadius: '8px',
                    border: '1px solid #ffcc02',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      right: '10px', 
                      background: '#d32f2f', 
                      color: 'white', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.8em',
                      fontWeight: 'bold'
                    }}>
                      LOW STOCK
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>{product.product_name}</h4>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.9em' }}>{product.brand}</p>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#d32f2f' }}>
                      Stock: {product.current_stock} / Min: {product.min_threshold}
                    </p>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#666' }}>
                      📍 {product.location}
                    </p>
                    <p style={{ margin: '0', fontSize: '0.8em', color: '#888' }}>
                      SKU: {product.sku}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div>
              <h2 style={{ marginBottom: '20px', color: '#333' }}>📦 Inventory by Category</h2>
              {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                <div key={category} style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    background: 'white', 
                    padding: '15px', 
                    borderRadius: '8px',
                    margin: '0 0 15px 0',
                    color: '#333',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {category} ({categoryProducts.length} items)
                  </h3>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '15px'
                  }}>
                    {categoryProducts.slice(0, 20).map((product) => (
                      <div key={product.id} style={{ 
                        background: 'white', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '8px',
                        padding: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1em', color: '#333' }}>
                          {product.product_name}
                        </h4>
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.9em' }}>
                          {product.brand} - {product.size} {product.unit_type}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.9em', color: '#666' }}>
                            Stock: <strong>{product.current_stock}</strong>
                          </span>
                          <span style={{ fontSize: '0.9em', color: '#666' }}>
                            Min: {product.min_threshold}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.9em', color: '#666' }}>
                            Cost: ${product.cost_per_unit}
                          </span>
                          <span style={{ 
                            fontSize: '0.8em', 
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: product.current_stock <= product.min_threshold ? '#ffebee' : '#e8f5e8',
                            color: product.current_stock <= product.min_threshold ? '#d32f2f' : '#388e3c',
                            fontWeight: 'bold'
                          }}>
                            {product.current_stock <= product.min_threshold ? 'LOW STOCK' : 'IN STOCK'}
                          </span>
                        </div>
                        <p style={{ margin: '0', fontSize: '0.8em', color: '#888' }}>
                          📍 {product.location}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {categoryProducts.length > 20 && (
                    <p style={{ textAlign: 'center', margin: '15px 0', color: '#666', fontStyle: 'italic' }}>
                      Showing 20 of {categoryProducts.length} products
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <h2 style={{ marginBottom: '20px', color: '#333' }}>✨ Services by Category</h2>
              {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                <div key={category} style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    background: 'white', 
                    padding: '15px', 
                    borderRadius: '8px',
                    margin: '0 0 15px 0',
                    color: '#333',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {category} ({categoryServices.length} services)
                  </h3>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '15px'
                  }}>
                    {categoryServices.map((service) => (
                      <div key={service.id} style={{ 
                        background: 'white', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '8px',
                        padding: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1em', color: '#333' }}>
                          {service.name}
                        </h4>
                        {service.description && (
                          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '0.9em', lineHeight: '1.4' }}>
                            {service.description.substring(0, 100)}{service.description.length > 100 ? '...' : ''}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '1.2em', 
                            fontWeight: 'bold', 
                            color: '#ff9a9e'
                          }}>
                            ${service.price}
                          </span>
                          <span style={{ fontSize: '0.9em', color: '#666' }}>
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer style={{ 
          textAlign: 'center', 
          padding: '30px 20px', 
          color: '#666',
          borderTop: '1px solid #e9ecef',
          backgroundColor: 'white',
          marginTop: '40px'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Keeping It Cute Salon & Spa</p>
          <p style={{ margin: '0 0 5px 0' }}>144 E Oak St, Juneau, WI</p>
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            Staff Portal - Last updated: {new Date().toLocaleString()}
          </p>
        </footer>
      </div>
    </>
  )
}
