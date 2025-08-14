import { useState, useEffect } from 'react'
import Head from 'next/head'
import useRequireSupabaseAuth from '../utils/useRequireSupabaseAuth'
import { fetchWithAuth } from '../utils/api'

export default function Profile() {
  const { authError, loading: authLoading } = useRequireSupabaseAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', gender: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!authLoading) loadProfile()
  }, [authLoading])

  const loadProfile = async () => {
    try {
      const res = await fetchWithAuth('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setForm({
          full_name: data.profile.full_name || '',
          phone: data.profile.phone || '',
          address: data.profile.address || '',
          gender: data.profile.gender || ''
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    const res = await fetchWithAuth('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setMessage('Profile saved')
      if (avatarFile) await uploadAvatar()
    } else {
      const err = await res.json().catch(() => ({}))
      setMessage(err.error || 'Failed to save')
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return
    const fd = new FormData()
    fd.append('avatar', avatarFile)
    const res = await fetchWithAuth('/api/upload-staff-avatar', {
      method: 'POST',
      body: fd
    })
    if (res.ok) {
      const data = await res.json()
      setProfile(data.profile)
      setAvatarFile(null)
    }
  }

  if (authError) {
    return <p style={{ padding: '2rem' }}>{authError}</p>
  }
  if (authLoading || loading) {
    return <p style={{ padding: '2rem' }}>Loading profile...</p>
  }

  return (
    <>
      <Head>
        <title>My Profile - Keeping It Cute Salon</title>
      </Head>
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>My Profile</h1>
        {message && <p>{message}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={profile?.avatar_url || '/images/avatar-placeholder.svg'} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
            <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} />
          </div>
          <label>
            Full Name
            <input type="text" name="full_name" value={form.full_name} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
          </label>
          <label>
            Address
            <input type="text" name="address" value={form.address} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
          </label>
          <label>
            Phone
            <input type="text" name="phone" value={form.phone} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
          </label>
          <label>
            Gender
            <input type="text" name="gender" value={form.gender} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
          </label>
          <label>
            Email
            <input type="email" value={profile?.email || ''} disabled style={{ width: '100%', padding: '8px' }} />
          </label>
          <button type="submit" style={{ padding: '10px', background: '#e0cdbb', border: 'none', borderRadius: '4px', color: 'white' }}>
            Save
          </button>
        </form>
      </div>
    </>
  )
}
