import { useState } from 'react'

export default function CalendarView({ appointments, onAppointmentClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const addMonths = (date, months) => {
    const d = new Date(date)
    d.setMonth(d.getMonth() + months)
    return d
  }

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  const appointmentsByDate = appointments.reduce((acc, apt) => {
    if (!apt.appointment_date) return acc
    const dateKey = apt.appointment_date.slice(0, 10)
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(apt)
    return acc
  }, {})

  const days = []
  const prefixBlanks = startOfMonth.getDay()
  for (let i = 0; i < prefixBlanks; i++) {
    days.push(null)
  }
  for (let d = 1; d <= endOfMonth.getDate(); d++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d)
    const key = date.toISOString().slice(0, 10)
    days.push({ date, appointments: appointmentsByDate[key] || [] })
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1))

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <button onClick={prevMonth} style={{ padding: '5px 10px' }}>«</button>
        <h3 style={{ margin: 0 }}>{monthName}</h3>
        <button onClick={nextMonth} style={{ padding: '5px 10px' }}>»</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '5px', fontWeight: 'bold' }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((day, idx) => (
          <div key={idx} style={{ minHeight: '80px', background: 'white', border: '1px solid #e9ecef', borderRadius: '4px', padding: '4px', fontSize: '0.8em' }}>
            {day && (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{day.date.getDate()}</div>
                {day.appointments.map(a => (
                  <div key={a.id} onClick={() => onAppointmentClick && onAppointmentClick(a)} style={{ cursor: 'pointer', marginBottom: '2px', textAlign: 'left' }}>
                    {new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {a.customer_name || ''}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
