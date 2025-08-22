import { useState, useEffect } from 'react'
import { edgeClient } from '../utils/api'
import { getBrowserSupabaseClient } from '../utils/supabaseBrowserClient'

export default function EnhancedBookingCalendar({ staffId = null }) {
  const [availability, setAvailability] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [authToken, setAuthToken] = useState(null)

  // Get auth token
  useEffect(() => {
    const getAuthToken = async () => {
      const supabase = getBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      setAuthToken(session?.access_token)
    }
    getAuthToken()
  }, [])

  // Load availability and bookings
  const loadScheduleData = async (date) => {
    if (!authToken) return

    setLoading(true)
    try {
      // Get availability
      const availabilityData = await edgeClient.checkAvailability(date, staffId)
      setAvailability(availabilityData.available_slots || [])

      // Get bookings for the day
      const bookingsData = await edgeClient.getUpcomingBookings(staffId, 1, authToken)
      const dayBookings =
        bookingsData.bookings?.filter((booking) =>
          booking.appointment_date.startsWith(date)
        ) || []
      setBookings(dayBookings)
    } catch (error) {
      console.error('Failed to load schedule data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authToken) {
      loadScheduleData(selectedDate)
    }
  }, [selectedDate, staffId, authToken])

  return (
    <div className="enhanced-booking-calendar">
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="date-picker">Select Date: </label>
        <input
          id="date-picker"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      {loading && <div>Loading schedule...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Available Time Slots */}
        <div>
          <h3>Available Times</h3>
          <div className="time-slots">
            {availability.map((slot, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  margin: '4px 0',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  // Handle booking creation
                  console.log('Create booking for', slot.start_time)
                }}
              >
                {new Date(slot.start_time).toLocaleTimeString()} -
                {new Date(slot.end_time).toLocaleTimeString()}
              </div>
            ))}
          </div>
        </div>

        {/* Existing Bookings */}
        <div>
          <h3>Existing Bookings</h3>
          <div className="bookings">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  padding: '12px',
                  margin: '8px 0',
                  backgroundColor: '#fff3e0',
                  borderRadius: '4px',
                  border: '1px solid #ffcc02',
                }}
              >
                <strong>{booking.customer_name}</strong>
                <br />
                <span>{booking.service_name}</span>
                <br />
                <small>{new Date(booking.appointment_date).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

