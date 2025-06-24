import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

// Helper to safely render values that might be translation objects
const toText = (val) => {
  if (val && typeof val === 'object' && ('original' in val || 'translated' in val)) {
    return val.translated || val.original || ''
  }
  return val
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/get-orders')
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderClick = (order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const closeOrderDetails = () => {
    setSelectedOrder(null)
    setShowOrderDetails(false)
  }

  return (
    <>
      <Head>
        <title>Orders - Keeping It Cute Salon</title>
      </Head>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>🛒 Recent Orders</h1>
          <button
            onClick={() => router.push('/staff')}
            style={{
              background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
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
        {loading ? (
          <p style={{ textAlign: 'center' }}>Loading orders...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: 'red' }}>❌ {error}</p>
        ) : orders.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '20px' }}>🛒</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Orders Found</h3>
            <p style={{ color: '#888', fontSize: '0.9em' }}>
              Orders will appear here once transactions occur on your Wix website.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => handleOrderClick(order)}
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
                      Order #{toText(order.order_number) || order.id?.slice(0,8)}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '1em' }}>
                      📧 {toText(order.customer_email) || 'No email'}
                    </p>
                    {order.fulfillment_status && (
                      <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.95em' }}>
                        📦 {toText(order.fulfillment_status)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8em',
                      fontWeight: 'bold',
                      backgroundColor: order.payment_status === 'paid' ? '#e8f5e8' : '#fff3e0',
                      color: order.payment_status === 'paid' ? '#2e7d32' : '#f57c00'
                    }}>
                      {toText(order.payment_status)?.toUpperCase() || 'PENDING'}
                    </span>
                    {order.total_amount && (
                      <span style={{
                        fontSize: '1.1em',
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        ${parseFloat(order.total_amount).toFixed(2)}
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

        {showOrderDetails && selectedOrder && (
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
                <h2 style={{ margin: 0, color: '#333', fontSize: '1.6em' }}>
                  🛒 Order #{toText(selectedOrder.order_number) || selectedOrder.id?.slice(0,8)}
                </h2>
                <button
                  onClick={closeOrderDetails}
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
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Customer Information</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '15px'
                }}>
                  <div><strong>Email:</strong> {toText(selectedOrder.customer_email) || 'None'}</div>
                  <div><strong>Payment Status:</strong> {toText(selectedOrder.payment_status)}</div>
                  <div><strong>Fulfillment:</strong> {toText(selectedOrder.fulfillment_status) || 'pending'}</div>
                  <div><strong>Total:</strong> ${selectedOrder.total_amount ? parseFloat(selectedOrder.total_amount).toFixed(2) : '0.00'}</div>
                </div>
              </div>

              <div style={{
                background: '#fff3e0',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Items</h3>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {selectedOrder.items.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        <strong>{toText(item.name) || toText(item.productName) || 'Item'}</strong> - Qty: {item.quantity || item.qty || 1}
                        {item.price && (
                          <span style={{ marginLeft: '10px' }}>
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No items listed.</p>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={closeOrderDetails}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
