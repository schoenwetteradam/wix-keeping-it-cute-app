// pages/product-usage/[bookingId].js
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
      
      // Load all products
      const productsResponse = await fetch('/api/get-products')
      if (!productsResponse.ok) throw new Error('Failed to load products')
      const productsData = await productsResponse.json()
      setProducts(productsData.products || [])
      
      // Initialize with one empty usage item
      setUsageItems([{
        id: Date.now(),
        product_id: '',
        quantity_used: '',
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
      quantity_used: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Filter out empty items
      const validItems = usageItems.filter(item => 
        item.product_id && item.quantity_used && parseFloat(item.quantity_used) > 0
      )

      if (validItems.length === 0) {
        throw new Error('Please add at least one product usage item')
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

      // Log product usage
      const usageResponse = await fetch('/api/log-product-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: validItems.map(item => ({
            usage_session_id: sessionData.session.id,
            product_id: item.product_id,
            quantity_used: parseFloat(item.quantity_used),
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
      }, 2000)

    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading...</h1>
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
          {booking && (
            <div style={{ marginTop: '10px', opacity: 0.9 }}>
              <p style={{ margin: '5px 0' }}>
                <strong>Customer:</strong> {booking.customer_name}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Service:</strong> {booking.service_name}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Date:</strong> {new Date(booking.appointment_date).toLocaleString()}
              </p>
              {booking.staff_member && (
                <p style={{ margin: '5px 0' }}>
                  <strong>Staff:</strong> {booking.staff_member}
                </p>
              )}
            </div>
          )}
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
              Redirecting you back to the appointments...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ 
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#333' }}>
                Products Used During Service
              </h2>

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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '15px'
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

                    {/* Quantity Used */}
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        Quantity Used *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity_used}
                        onChange={(e) => updateUsageItem(item.id, 'quantity_used', e.target.value)}
                        required
                        placeholder="e.g., 1.5"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    {/* Notes */}
                    <div style={{ gridColumn: '1 / -1' }}>
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
                        placeholder="Any additional notes about this product usage..."
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
                  {saving ? 'Saving...' : 'Save Product Usage'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
