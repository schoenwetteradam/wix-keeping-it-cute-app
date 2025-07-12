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

  // sort appointments by date so calendar always shows earliest first
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)
  )

  const appointmentsByDate = sortedAppointments.reduce((acc, apt) => {
    if (!apt.appointment_date) return acc
    const dateKey = apt.appointment_date.slice(0, 10)
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(apt)
    return acc
  }, {})

  // ensure appointments within each day are sorted
  Object.keys(appointmentsByDate).forEach(key => {
    appointmentsByDate[key].sort(
      (a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)
    )
  })

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
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={prevMonth} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#f7f7f7', cursor: 'pointer' }}>«</button>
        <h3 style={{ margin: 0, fontSize: '1.25em' }}>{monthName}</h3>
        <button onClick={nextMonth} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#f7f7f7', cursor: 'pointer' }}>»</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold', color: '#555' }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {days.map((day, idx) => {
          const isToday = day && new Date().toDateString() === day.date.toDateString()
          return (
            <div
              key={idx}
              style={{
                minHeight: '100px',
                background: isToday ? '#e7f3ff' : '#fafafa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '6px',
                fontSize: '0.85em',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {day && (
                <>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: isToday ? '#1976d2' : '#333' }}>
                    {day.date.getDate()}
                  </div>
                  {day.appointments.map(a => (
                    <div
                      key={a.id}
                      onClick={() =>
                        onAppointmentClick && onAppointmentClick(a)
                      }
                      style={{
                        cursor: 'pointer',
                        marginBottom: '4px',
                        textAlign: 'left',
                        background: 'rgba(25, 118, 210, 0.15)',
                        borderRadius: '6px',
                        padding: '4px 6px'
                      }}
                    >
                      {new Date(a.appointment_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}{' '}
                      {a.customer_name || ''}
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
