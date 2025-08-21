import { useState } from 'react'
import { callAPI } from '../utils/hybridAPI'
import { featureFlags } from '../utils/featureFlags'

export default function BookingCalendar() {
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)

  const checkAvailability = async (date, staffId) => {
    setLoading(true)
    try {
      const endpoint = featureFlags.enhancedBooking
        ? 'booking-operations?action=check-availability'
        : 'query-availability'

      const data = await callAPI(endpoint, {
        method: 'GET',
        useEdge: featureFlags.enhancedBooking,
        fallback: true,
        params: { date, staff_id: staffId, duration: 60 },
      })

      setAvailability(data.slots || data.available_slots || [])
    } catch (error) {
      console.error('Availability check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="booking-calendar">
      {loading && <div>Checking availability...</div>}
      {featureFlags.enhancedBooking && (
        <div className="enhanced-features">
          <p>✨ Enhanced availability with buffer times</p>
        </div>
      )}
    </div>
  )
}
