import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { toPlainString } from '../utils/translation'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [orderBookings, setOrderBookings] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('newest')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/get-orders?limit=100')
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      const normalized = (data.orders || []).map(order => ({
        ...order,
        order_number: toPlainString(order.order_number),
        customer_email: toPlainString(order.customer_email),
        fulfillment_status: toPlainString(order.fulfillment_status),
        payment_status: toPlainString(order.payment_status),
        total_amount: toPlainString(order.total_amount)
      }))
      setOrders(normalized)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderClick = async (order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
    setOrderBookings([])
    try {
      const res = await fetch(`/api/get-order-bookings?order_id=${order.wix_order_id || order.id}`)
      if (res.ok) {
        const data = await res.json()
        setOrderBookings(data.bookings || [])
      }
    } catch (err) {
      console.error('Failed to load order bookings:', err)
    }
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
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: '2', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}
          />
          <select value={sortOption} onChange={e => setSortOption(e.target.value)} style={{ padding: '10px', borderRadius: '4px' }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="amount-desc">Amount High-Low</option>
            <option value="amount-asc">Amount Low-High</option>
          </select>
          <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>Orders: {orders.length}</span>
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
            {(() => {
              const term = searchTerm.toLowerCase()
              const filtered = orders.filter(o =>
                (o.order_number || '').toLowerCase().includes(term) ||
                (o.customer_email || '').toLowerCase().includes(term)
              )
              const sorted = filtered.sort((a, b) => {
                if (sortOption === 'amount-asc') {
                  return parseFloat(a.total_amount || 0) - parseFloat(b.total_amount || 0)
                }
                if (sortOption === 'amount-desc') {
                  return parseFloat(b.total_amount || 0) - parseFloat(a.total_amount || 0)
                }
                if (sortOption === 'oldest') {
                  return new Date(a.created_at) - new Date(b.created_at)
                }
                return new Date(b.created_at) - new Date(a.created_at)
              })
              return sorted.map(order => (
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
                      Order #{order.order_number || order.id?.slice(0,8)}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '1em' }}>
                      📧 {order.customer_email || 'No email'}
                    </p>
                    {order.fulfillment_status && (
                      <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.95em' }}>
                        📦 {order.fulfillment_status}
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
                      {order.payment_status?.toUpperCase() || 'PENDING'}
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
              ))
            })()}
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
                  🛒 Order #{selectedOrder.order_number || selectedOrder.id?.slice(0,8)}
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
                  <div><strong>Email:</strong> {selectedOrder.customer_email || 'None'}</div>
                  <div><strong>Payment Status:</strong> {selectedOrder.payment_status}</div>
                  <div><strong>Fulfillment:</strong> {selectedOrder.fulfillment_status || 'pending'}</div>
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
                        <strong>{toPlainString(item.name || item.productName) || 'Item'}</strong> - Qty: {item.quantity || item.qty || 1}
                        {item.price && (
                          <span style={{ marginLeft: '10px' }}>
                            ${parseFloat(toPlainString(item.price)).toFixed(2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No items listed.</p>
                )}
              </div>

              {orderBookings.length > 0 && (
                <div style={{
                  background: '#e8f5e9',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Related Bookings</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {orderBookings.map(b => (
                      <li key={b.id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        <strong>{b.customer_name || 'Customer'}</strong> - {b.service_name || 'Service'} on {b.appointment_date ? new Date(b.appointment_date).toLocaleString() : 'Unknown'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
