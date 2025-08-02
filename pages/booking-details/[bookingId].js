import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StaffNavBar from '../../components/StaffNavBar';
import { fetchWithAuth } from '../../utils/api';

export default function BookingDetails() {
  const router = useRouter();
  const { bookingId } = router.query;

  const [booking, setBooking] = useState(null);
  const [branding, setBranding] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
      loadBranding();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const res = await fetchWithAuth(`/api/get-booking/${bookingId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load booking');
      setBooking(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBranding = async () => {
    try {
      const res = await fetchWithAuth('/api/get-branding');
      if (res.ok) {
        const data = await res.json();
        setBranding(data.branding);
      }
    } catch (err) {
      console.error('Error loading branding:', err);
    }
  };

  const refresh = () => loadBooking();

  const handleConfirmOrDecline = async () => {
    const paymentStatus = prompt('Payment status (e.g. PAID, NOT_PAID)', booking?.payment_status || 'PAID');
    if (!paymentStatus) return;
    try {
      const res = await fetchWithAuth(`/api/confirm-or-decline-booking/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus })
      });
      if (!res.ok) throw new Error('Failed to update booking');
      await refresh();
    } catch (err) {
      alert('Confirm/Decline failed');
      console.error(err);
    }
  };

  const handleConfirm = async () => {
    const paymentStatus = prompt('Payment status (optional)', booking?.payment_status || '');
    try {
      const res = await fetchWithAuth(`/api/confirm-booking/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: booking.revision, paymentStatus })
      });
      if (!res.ok) throw new Error('Failed to confirm booking');
      await refresh();
    } catch (err) {
      alert('Confirm failed');
      console.error(err);
    }
  };

  const handleDecline = async () => {
    try {
      const res = await fetchWithAuth(`/api/decline-booking/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: booking.revision })
      });
      if (!res.ok) throw new Error('Failed to decline booking');
      await refresh();
    } catch (err) {
      alert('Decline failed');
      console.error(err);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this booking?')) return;
    try {
      const res = await fetchWithAuth(`/api/cancel-booking/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: booking.revision })
      });
      if (!res.ok) throw new Error('Failed to cancel booking');
      await refresh();
    } catch (err) {
      alert('Cancel failed');
      console.error(err);
    }
  };

  const handleReschedule = async () => {
    const start = prompt('New start time (YYYY-MM-DDTHH:MM)', booking.startDate?.slice(0,16));
    if (!start) return;
    const end = prompt('New end time (YYYY-MM-DDTHH:MM)', booking.endDate?.slice(0,16));
    if (!end) return;
    try {
      const res = await fetchWithAuth(`/api/reschedule-booking/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(), revision: booking.revision })
      });
      if (!res.ok) throw new Error('Failed to reschedule');
      await refresh();
    } catch (err) {
      alert('Reschedule failed');
      console.error(err);
    }
  };

  const handleUpdateParticipants = async () => {
    const total = prompt('Total participants', booking.total_participants || booking.totalParticipants || 1);
    if (!total) return;
    try {
      const res = await fetchWithAuth(`/api/update-number-of-participants/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: booking.revision, totalParticipants: parseInt(total) })
      });
      if (!res.ok) throw new Error('Failed to update participants');
      await refresh();
    } catch (err) {
      alert('Update participants failed');
      console.error(err);
    }
  };

  const handleUpdateExtendedFields = async () => {
    const namespace = prompt('Namespace', '@account/app');
    if (!namespace) return;
    const dataStr = prompt('Namespace data (JSON)', '{"key":"value"}');
    if (!dataStr) return;
    let namespaceData;
    try {
      namespaceData = JSON.parse(dataStr);
    } catch (e) {
      alert('Invalid JSON');
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/update-booking-extended-fields/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace, namespaceData })
      });
      if (!res.ok) throw new Error('Failed to update extended fields');
      alert('Extended fields updated');
    } catch (err) {
      alert('Update extended fields failed');
      console.error(err);
    }
  };

  if (loading) return <p style={{padding:'20px'}}>Loading booking...</p>;
  if (error) return <p style={{padding:'20px',color:'red'}}>Error: {error}</p>;
  if (!booking) return <p style={{padding:'20px'}}>Booking not found.</p>;

  return (
    <>
      <Head><title>Booking Details</title></Head>
      <StaffNavBar branding={branding} activeTab="appointments" />
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ marginBottom: '20px' }}>Booking Details</h1>
        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleConfirmOrDecline} style={{ marginRight: '8px' }}>Confirm/Decline</button>
          <button onClick={handleConfirm} style={{ marginRight: '8px' }}>Confirm</button>
          <button onClick={handleDecline} style={{ marginRight: '8px' }}>Decline</button>
          <button onClick={handleCancel} style={{ marginRight: '8px' }}>Cancel</button>
          <button onClick={handleReschedule} style={{ marginRight: '8px' }}>Reschedule</button>
          <button onClick={handleUpdateParticipants} style={{ marginRight: '8px' }}>Participants</button>
          <button onClick={handleUpdateExtendedFields}>Extended Fields</button>
        </div>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {Object.entries(booking).map(([key, value]) => (
              <tr key={key}>
                <td style={{ fontWeight: 'bold', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>{key}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #ccc' }}>{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
