// pages/staff.js - Complete Staff Portal with Product Details & Audit
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function StaffPortal() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('inventory')
  
  // Product details modal
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showProductDetails, setShowProductDetails] = useState(false)

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
      
      // Load appointments
      const appointmentsResponse = await fetch('/api/get-appointments')
      if (!appointmentsResponse.ok) {
        throw new Error(`Appointments API Error: ${appointmentsResponse.status}`)
      }
      const appointmentsData = await appointmentsResponse.json()
      console.log('Appointments loaded:', appointmentsData.count)
      
      setProducts(productsData.products || [])
      setServices(servicesData.services || [])
      setAppointments(appointmentsData.appointments || [])
      setAlerts(productsData.low_stock_alerts || [])
      setLoading(false)
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setShowProductDetails(true)
  }

  const closeProductDetails = () => {
    setShowProductDetails(false)
    setSelectedProduct(null)
  }

  const navigateToAudit = () => {
    router.push('/inventory-audit')
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
          <div style={{ display: 'flex', gap: '0', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0' }}>
              {['inventory', 'services', 'appointments', 'alerts'].map(tab => (
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
                  {tab === 'inventory' && '📦'} {tab === 'services' && '✨'} {tab === 'appointments' && '📅'} {tab === 'alerts' && '🚨'} {tab}
                </button>
              ))}
            </div>
            
            {/* Audit Button */}
            {activeTab === 'inventory' && (
              <button
                onClick={navigateToAudit}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                📊 Start Inventory Audit
              </button>
            )}
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
            
            <div style={{ 
              background: 'white', 
              padding: '25px', 
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#9c27b0', fontSize: '1.1em' }}>📅 Appointments</h3>
              <p style={{ fontSize: '2.5em', margin: 0, fontWeight: 'bold', color: '#333' }}>
                {appointments.length}
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9em' }}>Recent Bookings</p>
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
                  <div 
                    key={product.id} 
                    onClick={() => handleProductClick(product)}
                    style={{ 
                      background: '#fff3e0', 
                      padding: '20px', 
                      borderRadius: '8px',
                      border: '1px solid #ffcc02',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
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

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div>
              <h2 style={{ marginBottom: '20px', color: '#333' }}>📅 Recent Appointments</h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '20px'
              }}>
                {appointments.slice(0, 20).map((appointment) => (
                  <div key={appointment.id} style={{ 
                    background: 'white', 
                    border: '1px solid #e9ecef', 
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '1.1em' }}>
                          {appointment.customer_name}
                        </h4>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em' }}>
                          {appointment.service_name}
                        </p>
                        <p style={{ margin: '0', color: '#888', fontSize: '0.8em' }}>
                          {new Date(appointment.appointment_date).toLocaleString()}
                        </p>
                      </div>
                      
                      <span style={{ 
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8em',
                        fontWeight: 'bold',
                        backgroundColor: appointment.payment_status === 'paid' ? '#e8f5e8' : '#fff3e0',
                        color: appointment.payment_status === 'paid' ? '#2e7d32' : '#f57c00'
                      }}>
                        {appointment.payment_status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      justifyContent: 'flex-end',
                      marginTop: '15px'
                    }}>
                      <button
                        onClick={() => window.open(`/product-usage/${appointment.id}`, '_blank')}
                        style={{
                          background: '#ff9a9e',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9em',
                          fontWeight: 'bold'
                        }}
                      >
                        📦 Log Product Usage
                      </button>
                    </div>
                    
                    {appointment.staff_member && (
                      <p style={{ 
                        margin: '10px 0 0 0', 
                        color: '#666', 
                        fontSize: '0.8em',
                        fontStyle: 'italic'
                      }}>
                        Staff: {appointment.staff_member}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>📦 Inventory by Category</h2>
                <p style={{ margin: 0, color: '#666', fontSize: '0.9em', fontStyle: 'italic' }}>
                  Click on any product to view detailed information
                </p>
              </div>
              
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
                      <div 
                        key={product.id} 
                        onClick={() => handleProductClick(product)}
                        style={{ 
                          background: 'white', 
                          border: '1px solid #e9ecef', 
                          borderRadius: '8px',
                          padding: '20px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      >
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

        {/* Product Details Modal */}
        {showProductDetails && selectedProduct && (
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
                <h2 style={{ margin: 0, color: '#333', fontSize: '1.5em' }}>Product Details</h2>
                <button
                  onClick={closeProductDetails}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#ff9a9e', fontSize: '1.3em' }}>
                    {selectedProduct.product_name}
                  </h3>
                  <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '1.1em' }}>
                    <strong>Brand:</strong> {selectedProduct.brand}
                  </p>
                  <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                    <strong>Category:</strong> {selectedProduct.category}
                  </p>
                  <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                    <strong>Size:</strong> {selectedProduct.size} {selectedProduct.unit_type}
                  </p>
                  <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                    <strong>SKU:</strong> {selectedProduct.sku}
                  </p>
                </div>

                <div>
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Inventory Status</h4>
                    <p style={{ 
                      margin: '0 0 5px 0', 
                      fontSize: '1.2em',
                      fontWeight: 'bold',
                      color: selectedProduct.current_stock <= selectedProduct.min_threshold ? '#d32f2f' : '#388e3c'
                    }}>
                      Current Stock: {selectedProduct.current_stock}
                    </p>
                    <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                      Minimum Threshold: {selectedProduct.min_threshold}
                    </p>
                    <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                      Low Stock Alert: {selectedProduct.current_stock <= selectedProduct.min_threshold ? 'YES' : 'NO'}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Financial Information</h4>
                    <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                      Cost per Unit: <strong>${selectedProduct.cost_per_unit}</strong>
                    </p>
                    <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                      Total Value: <strong>${(selectedProduct.current_stock * selectedProduct.cost_per_unit).toFixed(2)}</strong>
                    </p>
                    <p style={{ margin: '0', color: '#666' }}>
                      Location: <strong>{selectedProduct.location}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {selectedProduct.description && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Description</h4>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.5' }}>
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '8px' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Stock History</h4>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em' }}>
                    Created: {new Date(selectedProduct.created_at).toLocaleDateString()}
                  </p>
                  <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
                    Last Updated: {new Date(selectedProduct.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '8px' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Product Status</h4>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em' }}>
                    Active: {selectedProduct.is_active ? 'Yes' : 'No'}
                  </p>
                  <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
                    Vendor: {selectedProduct.vendor || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Stock Level Indicator */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Stock Level Indicator</h4>
                <div style={{ 
                  background: '#f8f9fa', 
                  borderRadius: '8px', 
                  padding: '3px',
                  position: 'relative'
                }}>
                  <div
                    style={{
                      height: '20px',
                      borderRadius: '6px',
                      background: selectedProduct.current_stock <= selectedProduct.min_threshold 
                        ? 'linear-gradient(90deg, #dc3545 0%, #ffc107 100%)'
                        : 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
                      width: `${Math.min(100, (selectedProduct.current_stock / (selectedProduct.min_threshold * 2)) * 100)}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '10px', 
                    transform: 'translateY(-50%)',
                    color: 'white',
                    fontSize: '0.8em',
                    fontWeight: 'bold'
                  }}>
                    {selectedProduct.current_stock} / {selectedProduct.min_threshold * 2} units
                  </div>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  onClick={closeProductDetails}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
