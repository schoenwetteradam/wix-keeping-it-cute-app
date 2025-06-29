import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function CreateAppointment() {
  const router = useRouter()
  const [services, setServices] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [booking, setBooking] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch('/api/services')
        if (!res.ok) return
        const data = await res.json()
        setServices(data.services || [])
      } catch (err) {
        console.error('Failed to load services', err)
      }
    }
    loadServices()
  }, [])

  const createBooking = async (e) => {
    e.preventDefault()
    if (!serviceId || !start || !end) {
      setError('Please fill all required fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          slot: {
            startDate: new Date(start).toISOString(),
            endDate: new Date(end).toISOString()
          },
          contactDetails: contact
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create booking')
      setBooking(data.booking)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const collectPayment = async () => {
    if (!booking) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems: [{ catalogReference: { id: serviceId } }] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout')
      setCheckout(data.checkout)
      const url = data.checkout?.redirectUrl || data.checkout?.checkoutUrl
      if (url) window.location.href = url
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Create Appointment</title>
      </Head>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ marginBottom: '20px' }}>Create Appointment</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!booking ? (
          <form onSubmit={createBooking} style={{ maxWidth: '500px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label>Service:</label>
              <select value={serviceId} onChange={e => setServiceId(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                <option value="">Select a service</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Start Time:</label>
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>End Time:</label>
              <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>First Name:</label>
              <input type="text" value={contact.firstName} onChange={e => setContact({ ...contact, firstName: e.target.value })} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Last Name:</label>
              <input type="text" value={contact.lastName} onChange={e => setContact({ ...contact, lastName: e.target.value })} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Email:</label>
              <input type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Phone:</label>
              <input type="tel" value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} style={{ width: '100%', padding: '8px' }} />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '10px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {loading ? 'Creating...' : 'Create Appointment'}
            </button>
          </form>
        ) : (
          <div>
            <p>Appointment created successfully.</p>
            <pre style={{ background: '#f8f8f8', padding: '10px' }}>{JSON.stringify(booking, null, 2)}</pre>
            <button onClick={collectPayment} disabled={loading} style={{ padding: '10px 16px', background: '#ff9a9e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {loading ? 'Processing...' : 'Collect Payment'}
            </button>
            {checkout && (
              <pre style={{ background: '#f8f8f8', padding: '10px', marginTop: '10px' }}>{JSON.stringify(checkout, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    </>
  )
}
