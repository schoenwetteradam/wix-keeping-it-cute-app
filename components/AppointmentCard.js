import styles from './AppointmentCard.module.css'

export default function AppointmentCard({ appointment, onComplete, onCancel, onReschedule, onMarkPaid, onEditNotes }) {
  const {
    id,
    customer_name,
    service_name,
    appointment_date,
    status,
    payment_status,
    total_price,
    staff_member,
    notes,
  } = appointment

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <strong>{customer_name || 'Customer'}</strong>
          <div className={styles.service}>{service_name || 'Service'}</div>
        </div>
        <span className={styles.date}>
          {appointment_date ? new Date(appointment_date).toLocaleString() : ''}
        </span>
      </div>
      <div className={styles.meta}>
        <span>Status: {status}</span>
        <span>Payment: {payment_status || 'pending'}</span>
        {total_price && <span>Price: ${parseFloat(total_price).toFixed(2)}</span>}
        {staff_member && <span>Staff: {staff_member}</span>}
      </div>
      {notes && <div className={styles.notes}>Notes: {notes.substring(0, 80)}</div>}
      <div className={styles.actions}>
        <button onClick={() => onComplete(appointment)}>Complete</button>
        <button onClick={() => onCancel(appointment)}>Cancel</button>
        <button onClick={() => onReschedule(appointment)}>Reschedule</button>
        {payment_status !== 'paid' && (
          <button onClick={() => onMarkPaid(appointment)}>Mark Paid</button>
        )}
        <button onClick={() => onEditNotes(appointment)}>Notes</button>
        <button onClick={() => window.open(`/product-usage/${id}`, '_blank')}>Usage</button>
        <button onClick={() => window.open(`/booking-images/${id}`, '_blank')}>Images</button>
        <button onClick={() => window.open(`/booking-details/${id}`, '_blank')}>Details</button>
        <button onClick={() => window.open(`/collect-payment/${id}`, '_blank')}>Collect</button>
      </div>
    </div>
  )
}
