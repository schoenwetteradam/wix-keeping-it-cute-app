// pages/staff.js - COMPLETE FIXED Staff Portal
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function StaffPortal() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [alerts, setAlerts] = useState([])
  const [branding, setBranding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('inventory')

  // Product details modal
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showProductDetails, setShowProductDetails] = useState(false)

  // Appointment details modal
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false)
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      console.log('Loading salon data...')
      setLoading(true)

      // Load branding info
      const brandingResponse = await fetch('/api/get-branding')
      if (brandingResponse.ok) {
        const brandingData = await brandingResponse.json()
        setBranding(brandingData.branding)
      }

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

  const handleAppointmentClick = async (appointment) => {
    setSelectedAppointment(appointment)
    setAppointmentNotes(appointment.notes || '')
    setShowAppointmentDetails(true)

    // Check if product usage exists for this appointment
    try {
      const response = await fetch(`/api/get-booking/${appointment.id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedAppointment({
          ...appointment,
          has_product_usage: data.has_existing_usage,
          product_usage_completed: data.existing_usage_completed
        })
      }
    } catch (error) {
      console.error('Error checking product usage:', error)
    }
  }

  const closeAppointmentDetails = () => {
    setShowAppointmentDetails(false)
    setSelectedAppointment(null)
    setAppointmentNotes('')
  }

  const saveAppointmentNotes = async () => {
    if (!selectedAppointment) return

    try {
      setSavingNotes(true)

      const response = await fetch('/api/update-appointment-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: selectedAppointment.id,
          notes: appointmentNotes
        })
      })

      if (!response.ok) throw new Error('Failed to save notes')

      // Update local state
      setSelectedAppointment({
        ...selectedAppointment,
        notes: appointmentNotes
      })

      // Update appointments list
      setAppointments(appointments.map(apt => 
        apt.id === selectedAppointment.id 
          ? { ...apt, notes: appointmentNotes }
          : apt
      ))

      alert('Notes saved successfully!')

    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes. Please try again.')
    } finally {
      setSavingNotes(false)
    }
  }

  const navigateToAudit = () => {
    router.push('/inventory-audit')
  }

  // FIXED IMAGE ERROR HANDLER - No more 404 errors!
  const handleImageError = (e) => {
    if (e.target.dataset.fallbackSet === 'true') return;
    
    const width = e.target.offsetWidth || 200;
    const height = e.target.offsetHeight || 200;
    
    const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
      <circle cx="${width/2}" cy="${height*0.35}" r="${Math.min(width, height)*0.12}" fill="#ff9a9e" opacity="0.6"/>
      <rect x="${width*0.3}" y="${height*0.55}" width="${width*0.4}" height="${height*0.3}" rx="8" fill="#fecfef" opacity="0.6"/>
      <text x="${width/2}" y="${height*0.7}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.06}" fill="#666">Product</text>
      <text x="${width/2}" y="${height*0.77}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.05}" fill="#999">Image Coming Soon</text>
    </svg>`;
    
    try {
      e.target.src = `data:image/svg+xml;base64,${btoa(svgContent)}`;
      e.target.dataset.fallbackSet = 'true';
    } catch (encodingError) {
      // Fallback if btoa still fails
      e.target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
      e.target.dataset.fallbackSet = 'true';
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ marginBottom: '20px' }}>
          {branding?.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Salon Logo"
              style={{ height: '80px', width: 'auto' }}
              onError={handleImageError}
            />
          )}
          <h1 style={{ margin: '10px 0' }}>💅 {branding?.salon_name || 'Keeping It Cute Salon'} - Staff Portal</h1>
        </div>
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
        <div style={{ marginBottom: '20px' }}>
          {branding?.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Salon Logo"
              style={{ height: '80px', width: 'auto' }}
              onError={handleImageError}
            />
          )}
          <h1>💅 {branding?.salon_name || 'Keeping It Cute Salon'} - Staff Portal</h1>
        </div>
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
        <title>Staff Portal - {branding?.salon_name || 'Keeping It Cute Salon & Spa'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={branding?.logo_url || '/favicon.ico'} />
      </Head>

      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* Header with Logo */}
        <header style={{ 
          background: `linear-gradient(135deg, ${branding?.primary_color || '#ff9a9e'} 0%, ${branding?.secondary_color || '#fecfef'} 100%)`,
          padding: '30px 20px',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
            {branding?.logo_url && (
              <img 
                src={branding.logo_url} 
                alt="Salon Logo"
                style={{ height: '60px', width: 'auto' }}
                onError={handleImageError}
              />
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '2.5em', fontWeight: 'bold' }}>
                💅 {branding?.salon_name || 'Keeping It Cute'}
              </h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '1.3em', opacity: 0.9 }}>
                Staff Portal - Business Management
              </p>
            </div>
          </div>
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
                    backgroundColor: activeTab === tab ? (branding?.primary_color || '#ff9a9e') : 'transparent',
                    color: activeTab === tab ? 'white' : '#666',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: activeTab === tab ? 'bold' : 'normal',
                    borderBottom: activeTab === tab ? `3px solid ${branding?.primary_color || '#ff9a9e'}` : 'none',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'inventory' && '📦'} {tab === 'services' && '✨'} {tab === 'appointments' && '📅'} {tab === 'alerts' && '🚨'} {tab}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Audit Button - Only show on inventory tab */}
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

              {/* Logo Management Button - Show on all tabs */}
              <button
                onClick={() => router.push('/logo-management')}
                style={{
                  background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
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
                🎨 Manage Logo
              </button>

              {/* Upload Product Images Button - Only show on inventory tab */}
              {activeTab === 'inventory' && (
                <button
                  onClick={() => router.push('/upload-product-images')}
                  style={{
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
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
                  📸 Upload Images
                </button>
              )}
            </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>📅 Recent Appointments</h2>
                <p style={{ margin: 0, color: '#666', fontSize: '0.9em', fontStyle: 'italic' }}>
                  Click on any appointment to view details and manage product usage
                </p>
              </div>

              {appointments.length === 0 ? (
                <div style={{ 
                  background: 'white',
                  padding: '40px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '20px' }}>📅</div>
                  <h3 style={{ color: '#666', marginBottom: '10px' }}>No Appointments Found</h3>
                  <p style={{ color: '#888', fontSize: '0.9em' }}>
                    Appointments will appear here once bookings are made through your Wix website.
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: '20px'
                }}>
                  {appointments.slice(0, 20).map((appointment) => (
                    <div 
                      key={appointment.id} 
                      onClick={() => handleAppointmentClick(appointment)}
                      style={{ 
                        background: 'white', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '15px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '1.2em' }}>
                            {appointment.customer_name || 'Unknown Customer'}
                          </h4>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '1em' }}>
                            📧 {appointment.customer_email || 'No email'}
                          </p>
                          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.95em' }}>
                            ✨ {appointment.service_name || 'Unknown Service'}
                          </p>
                          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '0.9em' }}>
                            📅 {appointment.appointment_date ? new Date(appointment.appointment_date).toLocaleString() : 'No date'}
                          </p>
                          {appointment.staff_member && (
                            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.85em' }}>
                              👤 Staff: {appointment.staff_member}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <span style={{ 
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8em',
                            fontWeight: 'bold',
                            backgroundColor: appointment.payment_status === 'paid' ? '#e8f5e8' : '#fff3e0',
                            color: appointment.payment_status === 'paid' ? '#2e7d32' : '#f57c00'
                          }}>
                            {appointment.payment_status?.toUpperCase() || 'PENDING'}
                          </span>

                          {appointment.total_price && (
                            <span style={{ 
                              fontSize: '1.1em',
                              fontWeight: 'bold',
                              color: '#333'
                            }}>
                              ${parseFloat(appointment.total_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick action indicators */}
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

                        <span style={{
                          background: '#fff3e0',
                          color: '#f57c00',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75em',
                          fontWeight: 'bold'
                        }}>
                          📦 Product Usage
                        </span>
                      </div>

                      {appointment.notes && (
                        <div style={{ 
                          marginTop: '10px',
                          padding: '8px',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                          fontSize: '0.85em',
                          color: '#666',
                          fontStyle: 'italic'
                        }}>
                          💬 "{appointment.notes.substring(0, 50)}{appointment.notes.length > 50 ? '...' : ''}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inventory Tab with Images */}
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
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
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          gap: '15px'
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
                        {/* Product Image */}
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          flexShrink: 0,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#f8f9fa'
                        }}>
                          <img
                            src={product.image_url || ''}
                            alt={product.product_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={handleImageError}
                          />
                        </div>

                        {/* Product Details */}
                        <div style={{ flex: 1 }}>
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

          {/* Services Tab with Images */}
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                    gap: '15px'
                  }}>
                    {categoryServices.map((service) => (
                      <div key={service.id} style={{ 
                        background: 'white', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '8px',
                        padding: '20px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        display: 'flex',
                        gap: '15px'
                      }}>
                        {/* Service Image */}
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          flexShrink: 0,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#f8f9fa'
                        }}>
                          <img
                            src={service.image_url || ''}
                            alt={service.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={handleImageError}
                          />
                        </div>

                        {/* Service Details */}
                        <div style={{ flex: 1 }}>
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
                              color: branding?.primary_color || '#ff9a9e'
                            }}>
                              ${service.price}
                            </span>
                            <span style={{ fontSize: '0.9em', color: '#666' }}>
                              {service.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Modal with Image */}
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
              maxWidth: '700px',
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

              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                {/* Large Product Image */}
                <div style={{ 
                  width: '200px', 
                  height: '200px', 
                  flexShrink: 0,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef'
                }}>
                  <img
                    src={selectedProduct.image_url || ''}
                    alt={selectedProduct.product_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={handleImageError}
                  />
                </div>

                {/* Product Information */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 10px 0', color: branding?.primary_color || '#ff9a9e', fontSize: '1.3em' }}>
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
                  <p style={{ margin: '0', color: '#666' }}>
                    <strong>Location:</strong> {selectedProduct.location}
                  </p>
                </div>
              </div>

              {/* Inventory Status */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
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

              {selectedProduct.description && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>Description</h4>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.5' }}>
                    {selectedProduct.description}
                  </p>
                </div>
              )}

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

        {/* Appointment Details Modal */}
        {showAppointmentDetails && selectedAppointment && (
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
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: '1.6em' }}>📅 Appointment Details</h2>
                <button
                  onClick={closeAppointmentDetails}
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

              {/* Customer Information */}
              <div style={{ 
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>👤 Customer Information</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '15px'
                }}>
                  <div>
                    <strong>Name:</strong> {selectedAppointment.customer_name || 'Unknown'}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedAppointment.customer_email || 'Not provided'}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedAppointment.customer_phone || 'Not provided'}
                  </div>
                  <div>
                    <strong>Wix Contact ID:</strong> {selectedAppointment.wix_contact_id || 'None'}
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div style={{ 
                background: '#fff3e0',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>✨ Service Information</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '15px'
                }}>
                  <div>
                    <strong>Service:</strong> {selectedAppointment.service_name || 'Unknown Service'}
                  </div>
                  <div>
                    <strong>Duration:</strong> {selectedAppointment.service_duration || 'Not specified'} minutes
                  </div>
                  <div>
                    <strong>Staff Member:</strong> {selectedAppointment.staff_member || 'Not assigned'}
                  </div>
                  <div>
                    <strong>Location:</strong> {selectedAppointment.location || 'Salon'}
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div style={{ 
                background: '#e3f2fd',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📅 Appointment Details</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '15px'
                }}>
                  <div>
                    <strong>Date & Time:</strong><br />
                    {selectedAppointment.appointment_date ? new Date(selectedAppointment.appointment_date).toLocaleString() : 'Not scheduled'}
                  </div>
                  <div>
                    <strong>End Time:</strong><br />
                    {selectedAppointment.end_time ? new Date(selectedAppointment.end_time).toLocaleString() : 'Not specified'}
                  </div>
                  <div>
                    <strong>Payment Status:</strong><br />
                    <span style={{ 
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                      backgroundColor: selectedAppointment.payment_status === 'paid' ? '#e8f5e8' : '#fff3e0',
                      color: selectedAppointment.payment_status === 'paid' ? '#2e7d32' : '#f57c00'
                    }}>
                      {selectedAppointment.payment_status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <strong>Total Price:</strong><br />
                    ${selectedAppointment.total_price ? parseFloat(selectedAppointment.total_price).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div style={{ 
                background: '#f0f8ff',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📝 Appointment Notes</h3>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="Add notes about this appointment..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    onClick={saveAppointmentNotes}
                    disabled={savingNotes}
                    style={{
                      background: savingNotes ? '#ccc' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: savingNotes ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </div>

              {/* Product Usage Section */}
              <div style={{ 
                background: selectedAppointment.has_product_usage ? '#e8f5e8' : '#fff5f5',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📦 Product Usage</h3>

                {selectedAppointment.has_product_usage ? (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '15px'
                    }}>
                      <span style={{ fontSize: '1.5em' }}>✅</span>
                      <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                        Product usage has been logged for this appointment
                      </span>
                    </div>
                    <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
                      Status: {selectedAppointment.product_usage_completed ? 'Completed' : 'In Progress'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '15px'
                    }}>
                      <span style={{ fontSize: '1.5em' }}>⚠️</span>
                      <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                        Product usage not yet recorded
                      </span>
                    </div>
                    <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '0.9em' }}>
                      Record which products were used during this service for accurate inventory tracking.
                    </p>
                    <button
                      onClick={() => {
                        window.open(`/product-usage/${selectedAppointment.id}`, '_blank')
                      }}
                      style={{
                        background: '#ff9a9e',
                        color: 'white',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      📦 Log Product Usage
                    </button>
                  </div>
                )}
              </div>

              {/* System Information */}
              <div style={{ 
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '1em' }}>🔧 System Information</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '10px',
                  fontSize: '0.8em',
                  color: '#666'
                }}>
                  <div><strong>Booking ID:</strong> {selectedAppointment.wix_booking_id || 'None'}</div>
                  <div><strong>Order ID:</strong> {selectedAppointment.wix_order_id || 'None'}</div>
                  <div><strong>Created:</strong> {selectedAppointment.created_at ? new Date(selectedAppointment.created_at).toLocaleDateString() : 'Unknown'}</div>
                  <div><strong>Updated:</strong> {selectedAppointment.updated_at ? new Date(selectedAppointment.updated_at).toLocaleDateString() : 'Unknown'}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  onClick={closeAppointmentDetails}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Close
                </button>

                {!selectedAppointment.has_product_usage && (
                  <button
                    onClick={() => {
                      window.open(`/product-usage/${selectedAppointment.id}`, '_blank')
                    }}
                    style={{
                      background: '#ff9a9e',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    📦 Log Product Usage
                  </button>
                )}
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
          {branding?.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Salon Logo"
              style={{ height: '40px', width: 'auto', marginBottom: '10px' }}
              onError={handleImageError}
            />
          )}
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
            {branding?.salon_name || 'Keeping It Cute Salon & Spa'}
          </p>
          <p style={{ margin: '0 0 5px 0' }}>
            {branding?.address || '144 E Oak St, Juneau, WI'}
          </p>
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            Staff Portal - Last updated: {new Date().toLocaleString()}
          </p>
        </footer>
      </div>
    </>
  )
}
