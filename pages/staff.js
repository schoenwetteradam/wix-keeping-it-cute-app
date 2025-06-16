// pages/staff.js - COMPLETE Staff Portal with Fixed Image Handling
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

  // COMPLETELY FIXED IMAGE ERROR HANDLER
  const handleImageError = (e) => {
    // Prevent infinite loops
    if (e.target.dataset.fallbackSet === 'true') return;
    
    const width = e.target.offsetWidth || 200;
    const height = e.target.offsetHeight || 200;
    
    // FIXED: Create SVG without emoji characters to prevent encoding errors
    const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
      <circle cx="${width/2}" cy="${height*0.35}" r="${Math.min(width, height)*0.12}" fill="#ff9a9e" opacity="0.6"/>
      <rect x="${width*0.3}" y="${height*0.55}" width="${width*0.4}" height="${height*0.3}" rx="8" fill="#fecfef" opacity="0.6"/>
      <text x="${width/2}" y="${height*0.7}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.06}" fill="#666">Product</text>
      <text x="${width/2}" y="${height*0.8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.05}" fill="#999">Image Coming Soon</text>
    </svg>`;
    
    try {
      // Try base64 encoding first
      e.target.src = `data:image/svg+xml;base64,${btoa(svgContent)}`;
      e.target.dataset.fallbackSet = 'true';
    } catch (encodingError) {
      console.warn('Base64 encoding failed, using URL encoding:', encodingError);
      // Fallback to URL encoding if btoa fails
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
          <h1 style={{ margin: '10px 0' }}>Keeping It Cute Salon - Staff Portal</h1>
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
          <h1>Keeping It Cute Salon - Staff Portal</h1>
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
                {branding?.salon_name || 'Keeping It Cute'}
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
