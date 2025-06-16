// pages/logo-management.js - Create this file
import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function LogoManagement() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    
    // Simple demo - you can enhance this later
    setTimeout(() => {
      setUploading(false)
      alert('Logo upload feature coming soon!')
    }, 1000)
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
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ 
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                textAlign: 'center',
                minWidth: '300px'
              }}>
                <div style={{ 
                  width: '200px',
                  height: '100px',
                  margin: '0 auto 15px auto',
                  background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  💅 Keeping It Cute
                </div>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                  Current logo preview
                </p>
              </div>

              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Salon Name:</strong>
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginTop: '5px',
                    fontSize: '1.1em',
                    color: '#ff9a9e',
                    fontWeight: 'bold'
                  }}>
                    Keeping It Cute Salon & Spa
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
                    144 E Oak St, Juneau, WI
                  </div>
                </div>

                <div>
                  <strong>Brand Colors:</strong>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <div style={{ 
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#ff9a9e',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}></div>
                    <div style={{ 
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#fecfef',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}></div>
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
            
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              {uploading ? (
                <div>
                  <div style={{ fontSize: '2em', marginBottom: '15px' }}>⏳</div>
                  <p style={{ fontSize: '1.1em', color: '#666' }}>Uploading logo...</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '3em', marginBottom: '15px' }}>🎨</div>
                  <p style={{ fontSize: '1.1em', marginBottom: '15px', color: '#333' }}>
                    Click to select your salon logo
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#ff9a9e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  />
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '15px', margin: '15px 0 0 0' }}>
                    Supported formats: JPG, PNG, WebP, SVG • Max size: 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines */}
          <div style={{ 
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>📋 Logo Guidelines</h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px'
            }}>
              <div style={{ 
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📐 Dimensions</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
                  <li>Recommended: 300x150px</li>
                  <li>Aspect ratio: 2:1 (width:height)</li>
                  <li>Minimum: 200x100px</li>
                  <li>Maximum: 600x300px</li>
                </ul>
              </div>

              <div style={{ 
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🎨 File Format</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
                  <li>PNG (best for logos with transparency)</li>
                  <li>JPG (good for photos)</li>
                  <li>SVG (vector, scales perfectly)</li>
                  <li>WebP (modern, smaller files)</li>
                </ul>
              </div>
            </div>

            <div style={{ 
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#e3f2fd',
              borderRadius: '6px',
              border: '1px solid #bbdefb'
            }}>
              <p style={{ margin: '0', color: '#1565c0', fontSize: '0.9em' }}>
                💡 <strong>Note:</strong> This is a demo version. The full logo upload functionality 
                will be implemented soon. Your current logo system is working perfectly!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
