// pages/upload-product-images.js - Complete image upload interface
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function UploadProductImages() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/get-products')
      if (!response.ok) throw new Error('Failed to load products')
      
      const data = await response.json()
      setProducts(data.products || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) {
      alert('Please choose an image file')
      return
    }

    if (!selectedProduct) {
      alert('Please select a product first')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP)')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploading(true)
    setUploadResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('product_id', selectedProduct)
      
      const product = products.find(p => p.id == selectedProduct)
      formData.append('category', product?.category || 'other')

      console.log('Uploading image for product:', product?.product_name)

      const response = await fetch('/api/upload-product-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        setUploadResult(result)
        // Refresh products list to update image status
        await loadProducts()
        
        // Clear selection for next upload
        setSelectedProduct('')
        
        console.log('Upload successful:', result)
      } else {
        throw new Error(result.error || 'Upload failed')
      }

    } catch (err) {
      setError(err.message)
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) {
      handleFileUpload(files[0])
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
      handleFileUpload(e.target.files[0])
    }
  }

  const getProductsWithoutImages = () => {
    return products.filter(product => !product.image_url || product.image_url === '')
  }

  const getProductsWithImages = () => {
    return products.filter(product => product.image_url && product.image_url !== '')
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
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>📸</div>
          <h2>Loading products...</h2>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Upload Product Images - Keeping It Cute Salon</title>
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
              <h1 style={{ margin: 0, fontSize: '2em' }}>📸 Upload Product Images</h1>
              <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
                Add photos to your salon inventory ({products.length} total products)
              </p>
            </div>
            <button
              onClick={() => router.push('/staff?tab=inventory')}
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
              ← Back to Inventory
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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

          {/* Statistics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>📦</div>
              <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Total Products</h3>
              <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: '#666' }}>
                {products.length}
              </p>
            </div>
            
            <div style={{ 
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>✅</div>
              <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>With Images</h3>
              <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: '#28a745' }}>
                {getProductsWithImages().length}
              </p>
            </div>
            
            <div style={{ 
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>📷</div>
              <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Need Images</h3>
              <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: '#dc3545' }}>
                {getProductsWithoutImages().length}
              </p>
            </div>
          </div>

          {/* Product Selection */}
          <div style={{ 
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>1. Select Product</h3>
            
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Choose a product to add an image...</option>
              
              {/* Products without images first */}
              {getProductsWithoutImages().length > 0 && (
                <optgroup label="🚨 Products Missing Images">
                  {getProductsWithoutImages().map(product => (
                    <option key={product.id} value={product.id}>
                      📷 {product.product_name} - {product.brand} ({product.category})
                    </option>
                  ))}
                </optgroup>
              )}
              
              {/* Products with images */}
              {getProductsWithImages().length > 0 && (
                <optgroup label="✅ Products With Images (Replace Image)">
                  {getProductsWithImages().map(product => (
                    <option key={product.id} value={product.id}>
                      🔄 {product.product_name} - {product.brand} ({product.category})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            
            {selectedProduct && (
              <div style={{ 
                marginTop: '15px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
              }}>
                {(() => {
                  const product = products.find(p => p.id == selectedProduct)
                  return (
                    <div>
                      <strong>Selected:</strong> {product?.product_name} - {product?.brand}
                      <br />
                      <strong>Category:</strong> {product?.category}
                      <br />
                      <strong>SKU:</strong> {product?.sku}
                      {product?.image_url && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Current Image:</strong>
                          <img 
                            src={product.image_url} 
                            alt={product.product_name}
                            style={{ 
                              display: 'block',
                              marginTop: '10px',
                              width: '100px', 
                              height: '100px', 
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid #ddd'
                            }}
                            onError={(e) => {
                              e.target.src = '/images/placeholders/product-placeholder.jpg'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Upload Area */}
          <div style={{ 
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            marginBottom: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>2. Upload Image</h3>
            
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragOver ? '#ff9a9e' : selectedProduct ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                backgroundColor: dragOver ? '#fff5f6' : selectedProduct ? '#f8fff8' : '#f8f9fa',
                transition: 'all 0.3s ease',
                opacity: selectedProduct ? 1 : 0.6
              }}
            >
              {uploading ? (
                <div>
                  <div style={{ fontSize: '2em', marginBottom: '15px' }}>⏳</div>
                  <p style={{ fontSize: '1.1em', color: '#666' }}>Uploading image...</p>
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
                      backgroundColor: '#ff9a9e',
                      animation: 'loading 1.5s ease-in-out infinite'
                    }}></div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '3em', marginBottom: '15px' }}>
                    {selectedProduct ? '📸' : '⚠️'}
                  </div>
                  <p style={{ fontSize: '1.1em', marginBottom: '15px', color: selectedProduct ? '#333' : '#999' }}>
                    {selectedProduct 
                      ? 'Drag and drop an image here, or click to select'
                      : 'Please select a product first'
                    }
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    disabled={!selectedProduct}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: selectedProduct ? '#ff9a9e' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: selectedProduct ? 'pointer' : 'not-allowed',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  />
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '15px', margin: 0 }}>
                    Supported formats: JPG, PNG, WebP • Max size: 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div style={{ 
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              marginBottom: '25px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '2px solid #28a745'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>✅ Upload Successful!</h3>
              
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <img
                  src={uploadResult.image_url}
                  alt="Uploaded product"
                  style={{
                    width: '150px',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Image URL:</strong> 
                    <code style={{ 
                      background: '#f8f9fa', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      marginLeft: '8px',
                      fontSize: '0.9em'
                    }}>
                      {uploadResult.image_url}
                    </code>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Filename:</strong> {uploadResult.filename}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Category:</strong> {uploadResult.category}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>File Size:</strong> {(uploadResult.file_size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    <button
                      onClick={() => setUploadResult(null)}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Clear Result
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Gallery */}
          <div style={{ 
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>
              Product Gallery ({getProductsWithImages().length} with images)
            </h3>
            
            {getProductsWithImages().length > 0 ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '20px'
              }}>
                {getProductsWithImages().map(product => (
                  <div key={product.id} style={{ 
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '15px',
                    textAlign: 'center',
                    transition: 'transform 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => setSelectedProduct(product.id.toString())}
                  >
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        marginBottom: '12px'
                      }}
                      onError={(e) => {
                        e.target.src = '/images/placeholders/product-placeholder.jpg'
                      }}
                    />
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1em', color: '#333' }}>
                      {product.product_name}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#666' }}>
                      {product.brand}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      fontSize: '0.8em',
                      color: '#888'
                    }}>
                      <span>{product.category}</span>
                      <span>{product.sku}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: '#666',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '3em', marginBottom: '15px' }}>📷</div>
                <h4 style={{ margin: '0 0 10px 0' }}>No product images yet</h4>
                <p style={{ margin: 0 }}>
                  Upload some images to see them in the gallery!
                </p>
              </div>
            )}
          </div>
        </div>
        
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </>
  )
}
