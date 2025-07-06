import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import StaffNavBar from '../../components/StaffNavBar'
import { fetchWithAuth } from '../../utils/api'

export default function BookingImages() {
  const router = useRouter()
  const { bookingId } = router.query
  const [booking, setBooking] = useState(null)
  const [images, setImages] = useState([])
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [branding, setBranding] = useState(null)

  useEffect(() => {
    if (bookingId) {
      loadBooking()
      loadImages()
      loadBranding()
    }
  }, [bookingId])

  const loadBooking = async () => {
    const res = await fetchWithAuth(`/api/get-booking/${bookingId}`)
    if (res.ok) {
      const data = await res.json()
      setBooking(data.booking)
    }
  }

  const loadImages = async () => {
    const res = await fetchWithAuth(`/api/get-booking-images/${bookingId}`)
    if (res.ok) {
      const data = await res.json()
      setImages(data.images || [])
    }
  }

  const loadBranding = async () => {
    const res = await fetchWithAuth('/api/get-branding')
    if (res.ok) {
      const data = await res.json()
      setBranding(data.branding)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('booking_id', bookingId)

    const res = await fetchWithAuth('/api/upload-booking-file', {
      method: 'POST',
      body: form
    })
    if (res.ok) {
      setFile(null)
      await loadImages()
    } else {
      alert('Upload failed')
    }
    setUploading(false)
  }

  return (
    <>
      <Head><title>Booking Files</title></Head>
      <StaffNavBar branding={branding} activeTab="appointments" />
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Booking Files</h1>
        {booking && (
          <p>
            {booking.customer_name} - {new Date(booking.appointment_date).toLocaleDateString()}
          </p>
        )}

        <form onSubmit={handleUpload} style={{ marginBottom: '20px' }}>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginRight: '10px' }}
          />
          <button type="submit" disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        <div>
          {images.map((img) => (
            <div key={img.id} style={{ marginBottom: '10px' }}>
              <a href={img.file_url} target="_blank" rel="noreferrer">
                {img.file_name}
              </a>
            </div>
          ))}
          {images.length === 0 && <p>No files uploaded yet.</p>}
        </div>
      </div>
    </>
  )
}
