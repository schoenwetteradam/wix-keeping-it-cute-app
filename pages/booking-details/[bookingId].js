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

  if (loading) return <p style={{padding:'20px'}}>Loading booking...</p>;
  if (error) return <p style={{padding:'20px',color:'red'}}>Error: {error}</p>;
  if (!booking) return <p style={{padding:'20px'}}>Booking not found.</p>;

  return (
    <>
      <Head><title>Booking Details</title></Head>
      <StaffNavBar branding={branding} activeTab="appointments" />
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ marginBottom: '20px' }}>Booking Details</h1>
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
