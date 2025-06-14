// pages/product-usage/[bookingId].js - Complete form with appointment details
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function ProductUsageForm() {
  const router = useRouter()
  const { bookingId } = router.query
  
  const [booking, setBooking] = useState(null)
  const [products, setProducts] = useState([])
  const [usageItems, setUsageItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  useEffect(() => {
    if (bookingId) {
      loadBookingAndProducts()
    }
  }, [bookingId])

  const loadBookingAndProducts = async () => {
    try {
      setLoading(true)
      
      // Load booking details
      const bookingResponse = await fetch(`/api/get-booking/${bookingId}`)
      if (!bookingResponse.ok) throw new Error('Failed to load booking')
      const bookingData = await bookingResponse.json()
      setBooking(bookingData.booking)
      
      // Check if product usage was already submitted
      if (bookingData.has_existing_usage) {
        setAlreadySubmitted(true)
        setLoading(false)
        return
      }
      
      // Load all products
      const productsResponse = await fetch('/api/get-products')
      if (!productsResponse.ok) throw new Error('Failed to load products')
      const productsData = await productsResponse.json()
      setProducts(productsData.products || [])
      
      // Initialize with one empty usage item (1mL default)
      setUsageItems([{
        id: Date.now(),
        product_id: '',
        quantity_used: 1, // Auto-set to 1mL
        notes: ''
      }])
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addUsageItem = () => {
    setUsageItems([...usageItems, {
      id: Date.now(),
      product_id: '',
      quantity_used: 1, // Auto-set to 1mL for new items
      notes: ''
    }])
  }

  const removeUsageItem = (id) => {
    setUsageItems(usageItems.filter(item => item.id !== id))
  }

  const updateUsageItem = (id, field, value) => {
    setUsageItems(usageItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Parse customer name
  const getCustomerFirstName = () => {
    if (!booking?.customer_name) return 'Unknown'
    const nameParts = booking.customer_name.trim().split(' ')
    return nameParts[0] || 'Unknown'
  }

  const getCustomerLastName = () => {
    if (!booking?.customer_name) return 'Customer'
    const nameParts = booking.customer_name.trim().split(' ')
    return nameParts.slice(1).join(' ') || 'Customer'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Filter out items without products selected (quantity is always 1)
      const validItems = usageItems.filter(item => 
        item.product_id && item.product_id !== ''
      )

      if (validItems.length === 0) {
        throw new Error('Please select at least one product')
      }

      // Start usage session
      const sessionResponse = await fetch('/api/start-usage-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          customer_name: booking.customer_name,
          service_performed: booking.service_name,
          staff_member: booking.staff_member
        })
      })

      const sessionData = await sessionResponse.json()
      if (!sessionResponse.ok) throw new Error(sessionData.error)

      // Log product usage (all items are 1mL each)
      const usageResponse = await fetch('/api/log-product-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: validItems.map(item => ({
            usage_session_id: sessionData.session.id,
            product_id: item.product_id,
            quantity_used: 1, // Always 1mL
            notes: item.notes || null,
            booking_id: bookingId
          }))
        })
      })

      const usageData = await usageResponse.json()
      if (!usageResponse.ok) throw new Error(usageData.error)

      setSuccess(true)
      
      // Show success message and redirect after delay
      setTimeout(() => {
        router.push('/staff?tab=appointments')
      }, 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading appointment details...</h1>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Error: {error}</h1>
      </div>
    )
  }

  // Show message if already submitted
  if (alreadySubmitted) {
    return (
      <>
        <Head>
          <title>Product Usage Already Logged - Keeping It Cute Salon</title>
        </Head>
        <div style={{ 
          fontFamily: 'Arial, sans-serif', 
          backgroundColor: '#f8f9fa', 
          minHeight: '100vh',
          padding: '20px'
        }}>
          <div style={{ 
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            margin: '50px auto'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#28a745', marginBottom: '15px' }}>
              Product Usage Already Logged
            </h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Product usage has already been recorded for this appointment.
            </p>
            <button
              onClick={() => router.push('/staff?tab=appointments')}
              style={{
                background: '#ff9a9e',
                color: 'white',
                border: 'none',
                padding: '12px 25px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Back to Appointments
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Product Usage - {booking?.customer_name} - Keeping It Cute Salon</title>
      </Head>

      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        backgroundColor: '#f8f9fa', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          padding: '20px',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '25px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.8em' }}>📦 Product Usage Form</h1>
          <p style={{ margin: '10px 0 0 0', opacity: 0.9, fontSize: '1em' }}>
            Record products used during service
          </p>
        </div>

        {success ? (
          <div style={{ 
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#4CAF50', marginBottom: '15px' }}>
              Product Usage Logged Successfully!
            </h2>
            <p style={{ color: '#666' }}>
              Redirecting you back to appointments...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Appointment Details */}
            <div style={{ 
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#333', fontSize: '1.3em' }}>
                📋 Appointment Details
              </h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '20px'
              }}>
                {/* Customer First Name */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    Customer First Name
                  </label>
                  <input
                    type="text"
                    value={getCustomerFirstName()}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#f8f9fa',
                      color: '#666'
                    }}
                  />
                </div>

                {/* Customer Last Name */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    Customer Last Name
                  </label>
                  <input
                    type="text"
                    value={getCustomerLastName()}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#f8f9fa',
                      color: '#666'
                    }}
                  />
                </div>

                {/* Service Name */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    Service Performed
                  </label>
                  <input
                    type="text"
                    value={booking?.service_name || 'Unknown Service'}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#f8f9fa',
                      color: '#666'
                    }}
                  />
                </div>

                {/* Staff Member */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    Staff Member
                  </label>
                  <input
                    type="text"
                    value={booking?.staff_member || 'Unknown Staff'}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#f8f9fa',
                      color: '#666'
                    }}
                  />
                </div>

                {/* Appointment Date */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    Appointment Date & Time
                  </label>
                  <input
                    type="text"
                    value={booking?.appointment_date ? new Date(booking.appointment_date).toLocaleString() : 'Unknown Date'}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#f8f9fa',
                      color: '#666'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Products Used Section */}
            <div style={{ 
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#333' }}>
                📦 Products Used During Service
              </h2>
              <p style={{ marginBottom: '25px', color: '#666', fontSize: '0.95em' }}>
                Select all products used during this service. Each product will be logged as 1mL usage.
              </p>

              {usageItems.map((item, index) => (
                <div key={item.id} style={{ 
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '15px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: 0, color: '#333' }}>
                      Product #{index + 1}
                    </h4>
                    {usageItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUsageItem(item.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8em'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 2fr', 
                    gap: '15px',
                    alignItems: 'end'
                  }}>
                    {/* Product Selection */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        Product *
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateUsageItem(item.id, 'product_id', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Select a product...</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.product_name} - {product.brand} 
                            (Stock: {product.current_stock} {product.unit_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity (Fixed at 1mL) */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        Quantity
                      </label>
                      <div style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#f8f9fa',
                        color: '#666',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        1 mL
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateUsageItem(item.id, 'notes', e.target.value)}
                        placeholder="Any notes about this product..."
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Another Product Button */}
              <button
                type="button"
                onClick={addUsageItem}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginBottom: '20px'
                }}
              >
                + Add Another Product
              </button>

              {error && (
                <div style={{ 
                  background: '#f8d7da',
                  color: '#721c24',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                justifyContent: 'flex-end',
                marginTop: '25px'
              }}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 25px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: saving ? '#ccc' : '#ff9a9e',
                    color: 'white',
                    border: 'none',
                    padding: '12px 25px',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {saving ? 'Saving...' : 'Submit Product Usage'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
    </>
  )
}
