import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function CollectPaymentPage() {
  const router = useRouter()
  const { bookingId } = router.query
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')

  useEffect(() => {
    if (!bookingId) return
    const loadBooking = async () => {
      try {
        const res = await fetch(`/api/get-booking/${bookingId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load booking')
        setBooking(data.booking)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadBooking()
  }, [bookingId])

  const handleCheckout = async () => {
    if (!booking) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems: [{ catalogReference: { id: booking.service_id } }] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout')
      const url = data.checkout?.redirectUrl || data.checkout?.checkoutUrl
      if (url) {
        setCheckoutUrl(url)
        window.location.href = url
      } else {
        setCheckoutUrl(JSON.stringify(data.checkout))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <p>Error: {error}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Collect Payment</title>
      </Head>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Collect Payment</h1>
        {booking && (
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Customer:</strong> {booking.customer_name}</p>
            <p><strong>Service:</strong> {booking.salon_services?.name}</p>
            <p><strong>Price:</strong> ${booking.salon_services?.price}</p>
          </div>
        )}
        <button onClick={handleCheckout} style={{ padding: '10px 16px', background: '#e0cdbb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Generate Payment Link
        </button>
        {checkoutUrl && (
          <div style={{ marginTop: '20px' }}>
            <p>Checkout URL:</p>
            <pre style={{ background: '#f8f8f8', padding: '10px' }}>{checkoutUrl}</pre>
          </div>
        )}
      </div>
    </>
  )
}
