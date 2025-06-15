// pages/logo-management.js - Complete logo management interface
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function LogoManagement() {
  const router = useRouter()
  const [branding, setBranding] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBranding()
  }, [])

  const loadBranding = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/get-branding')
      if (response.ok) {
        const data = await response.json()
        setBranding(data.branding)
      }
    } catch (err) {
      setError('Failed to load branding information')
      console.error('Error loading branding:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (file) => {
    if (!file) {
      alert('Please choose an image file')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP, SVG)')
      return
    }

    // Validate file size (5MB max for logos)
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size must be less than 5MB')
      return
    }

    setUploading(true)
    setUploadResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('logo', file)

      console.log('Uploading salon logo...')

      const response = await fetch('/api/upload-salon-logo', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        setUploadResult(result)
        // Refresh branding info
        await loadBranding()
        
        console.log('Logo upload successful:', result)
        
        // Show success for a few seconds then clear
        setTimeout(() => {
          setUploadResult(null)
        }, 5000)
      } else {
        throw new Error(result.error || 'Logo upload failed')
      }

    } catch (err) {
      setError(err.message)
      console.error('Logo upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) {
      handleLogoUpload(files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleFileInputChange = (e) => {
    if (e.target.files[0]) {
      handleLogoUpload(e.target.files[0])
    }
  }

  // Fixed image error handler
  const handleImageError = (e) => {
    if (e.target.dataset.fallbackSet === 'true') return;
    
    const width = e.target.offsetWidth || 200;
    const height = e.target.offsetHeight || 100;
    
    const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" stroke="#ff9a9e" stroke-width="2"/>
      <text x="${width/2}" y="${height*0.35}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.08}" font-weight="bold" fill="#ff9a9e">💅 Keeping It Cute</text>
      <text x="${width/2}" y="${height*0.55}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.06}" fill="#666">Salon & Spa</text>
      <text x="${width/2}" y="${height*0.75}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.05}" fill="#999">Logo Coming Soon</text>
    </svg>`;
    
    e.target.src = `data:image/svg+xml;base64,${btoa(svgContent)}`;
    e.target.dataset.fallbackSet = 'true';
  }

  if (loading) {
    return (
      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        backgroundColor: '#f8f9fa', 
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>🎨</div>
          <h2>Loading logo management...</h2>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Logo Management - Keeping It Cute Salon</title>
      </Head>

      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        backgroundColor: '#f8f9fa', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
          padding: '30px',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '30px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2em' }}>🎨 Logo Management</h1>
              <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
                Upload and manage your salon's branding
              </p>
            </div>
            <button
              onClick={() => router.push('/staff')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back to Staff Portal
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Error Display */}
          {error && (
            <div style={{ 
              background: '#f8d7da',
              color: '#721c24',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              ❌ Error: {error}
            </div>
          )}

          {/* Success Display */}
          {uploadResult && (
            <div style={{ 
              background: '#d4edda',
              color: '#155724',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #c3e6cb'
            }}>
              ✅ Success: {uploadResult.message}
            </div>
          )}

          {/* Current Logo Display */}
          <div style={{ 
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Current Salon Logo</h3>
            
            <div style={{ 
              display: 'flex', 
              gap: '25px', 
              alignItems: 'flex-start',
              flexWrap: 'wrap'
            }}>
              {/* Logo Preview */}
              <div style={{ 
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                textAlign: 'center',
                minWidth: '300px'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <img 
                    src={branding?.logo_url || '/images/logo/salon-logo.png'}
                    alt="Salon Logo"
                    style={{ 
                      maxHeight: '120px', 
                      maxWidth: '250px',
                      width: 'auto',
                      height: 'auto'
                    }}
                    onError={handleImageError}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                  Current logo preview
                </p>
              </div>

              {/* Logo Information */}
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Salon Name:</strong>
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginTop: '5px',
                    fontSize: '1.1em',
                    color: branding?.primary_color || '#ff9a9e',
                    fontWeight: 'bold'
                  }}>
                    {branding?.salon_name || 'Keeping It Cute Salon & Spa'}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>Address:</strong>
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginTop: '5px'
                  }}>
                    {branding?.address || '144 E Oak St, Juneau, WI'}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>Brand Colors:</strong>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <div style={{ 
                      width: '40px',
                      height: '40px',
                      backgroundColor: branding?.primary_color || '#ff9a9e',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}></div>
                    <div style={{ 
                      width: '40px',
                      height: '40px',
                      backgroundColor: branding?.secondary_color || '#fecfef',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}></div>
                  </div>
                </div>

                <div>
                  <strong>Logo URL:</strong>
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginTop: '5px',
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                    wordBreak: 'break-all'
                  }}>
                    {branding?.logo_url || '/images/logo/salon-logo.png'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload New Logo */}
          <div style={{ 
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Upload New Logo</h3>
            
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragOver ? '#ff9a9e' : '#ddd'}`,
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                backgroundColor: dragOver ? '#fff5f6' : '#f8f9fa',
                transition: 'all 0.3s ease'
              }}
            >
              {uploading ? (
                <div>
                  <div style={{ fontSize: '2em', marginBottom: '15px' }}>⏳</div>
                  <p style={{ fontSize: '1.1em', color: '#666' }}>Uploading logo...</p>
                  <div style={{ 
                    width: '200px', 
                    height: '4px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '2px',
                    margin: '15px auto',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      backgroundColor: '#ff9a9e
