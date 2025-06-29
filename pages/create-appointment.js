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
  const [availability, setAvailability] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [error, setError] = useState('')
  const [branding, setBranding] = useState({ primary_color: '#e0cdbb', secondary_color: '#eee4da' })

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch('/api/services')
        if (res.ok) {
          const data = await res.json()
          setServices(data.services || [])
        }
      } catch (err) {
        console.error('Failed to load services', err)
      }
    }

    const loadBranding = async () => {
      try {
        const res = await fetch('/api/get-branding')
        if (res.ok) {
          const data = await res.json()
          setBranding(data.branding)
        }
      } catch (err) {
        console.error('Failed to load branding', err)
      }
    }

    loadServices()
    loadBranding()
  }, [])

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!serviceId) {
        setAvailability([])
        return
      }
      setLoadingAvailability(true)
      try {
        const res = await fetch('/api/query-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: { filter: { serviceId } } })
        })
        const data = await res.json()
        const slots =
          data.slots || data.availability?.slots || data.bookableSlots || []
        setAvailability(slots)
      } catch (err) {
        console.error('Failed to load availability', err)
      } finally {
        setLoadingAvailability(false)
      }
    }

    fetchAvailability()
  }, [serviceId])

  const selectSlot = (slot) => {
    const startDate = slot.startDate || slot.start || slot.from
    const endDate = slot.endDate || slot.end || slot.to
    if (startDate) setStart(startDate.slice(0, 16))
    if (endDate) setEnd(endDate.slice(0, 16))
  }

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
      <div
        style={{
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          background: branding.secondary_color,
          minHeight: '100vh'
        }}
      >
        <h1 style={{ marginBottom: '20px', color: branding.primary_color }}>
          Create Appointment
        </h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!booking ? (
          <form
            onSubmit={createBooking}
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <label>Service:</label>
              <select value={serviceId} onChange={e => setServiceId(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                <option value="">Select a service</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {serviceId && (
              <div style={{ marginBottom: '20px' }}>
                {loadingAvailability ? (
                  <p>Loading available slots...</p>
                ) : availability.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))',
                      gap: '8px'
                    }}
                  >
                    {availability.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSlot(slot)}
                        style={{
                          padding: '8px',
                          background: '#f9f9f9',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {new Date(
                          slot.startDate || slot.start || slot.from
                        ).toLocaleString()}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>No open slots found.</p>
                )}
              </div>
            )}
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
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: branding.primary_color,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Appointment'}
            </button>
          </form>
        ) : (
          <div>
            <p>Appointment created successfully.</p>
            <pre style={{ background: '#f8f8f8', padding: '10px' }}>{JSON.stringify(booking, null, 2)}</pre>
            <button
              onClick={collectPayment}
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: branding.primary_color,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
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
