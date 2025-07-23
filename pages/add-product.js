import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import StaffNavBar from '../components/StaffNavBar'
import { fetchWithAuth } from '../utils/api'

export default function AddProduct() {
  const router = useRouter()
  const [branding, setBranding] = useState(null)
  const [form, setForm] = useState({
    product_name: '',
    brand: '',
    category: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const res = await fetchWithAuth('/api/get-branding')
        if (res.ok) {
          const data = await res.json()
          setBranding(data.branding)
        }
      } catch (err) {
        console.error('Failed to load branding:', err)
      }
    }
    loadBranding()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth('/api/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create product')
      setSuccess(true)
      setTimeout(() => router.push('/staff?tab=inventory'), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Add Product - Keeping It Cute Salon</title>
      </Head>
      <div style={{ padding: '20px' }}>
        <StaffNavBar branding={branding} activeTab="inventory" />
        <div style={{ maxWidth: '600px', margin: '20px auto', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h1 style={{ marginTop: 0 }}>Add Product</h1>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Product Name</label>
              <input
                name="product_name"
                value={form.product_name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Brand</label>
              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>Product created!</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" disabled={loading} style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => router.back()} style={{ background: '#ccc', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
