import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function ProductDetails() {
  const router = useRouter()
  const { id } = router.query

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    const loadProduct = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/get-products?id=${id}`)
        if (!res.ok) throw new Error('Failed to load product')
        const data = await res.json()
        setProduct(data.product)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [id])

  const handleImageError = (e) => {
    if (e.target.dataset.fallbackSet === 'true') return
    const width = e.target.offsetWidth || 200
    const height = e.target.offsetHeight || 200
    const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`+
      `<rect width="${width}" height="${height}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>`+
      `<circle cx="${width/2}" cy="${height*0.35}" r="${Math.min(width, height)*0.12}" fill="#ff9a9e" opacity="0.6"/>`+
      `<rect x="${width*0.3}" y="${height*0.55}" width="${width*0.4}" height="${height*0.3}" rx="8" fill="#fecfef" opacity="0.6"/>`+
      `<text x="${width/2}" y="${height*0.7}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.06}" fill="#666">Product</text>`+
      `<text x="${width/2}" y="${height*0.77}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.05}" fill="#999">Image Coming Soon</text>`+
      `</svg>`
    e.target.src = `data:image/svg+xml;base64,${btoa(svgContent)}`
    e.target.dataset.fallbackSet = 'true'
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading product...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Error Loading Product</h1>
        <p>{error}</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Product not found</h1>
      </div>
    )
  }

  const sellingPrice = product.selling_price ?? product.retail_price ?? product.price ?? null

  return (
    <>
      <Head>
        <title>{product.product_name}</title>
      </Head>
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          background: 'linear-gradient(135deg, #fdfdfd 0%, #c097d2 40%, #9f84ca 70%, #efc315 100%)',
          minHeight: '100vh',
          padding: '20px'
        }}
      >
        <button onClick={() => router.back()} style={{ marginBottom: '20px' }}>← Back</button>
        <h1 style={{ marginTop: 0 }}>{product.product_name}</h1>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ width: '200px', height: '200px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
            <img
              src={product.image_url || ''}
              alt={product.product_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={handleImageError}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>Brand:</strong> {product.brand}</p>
            <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>SKU:</strong> {product.sku}</p>
            <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>Unit Size:</strong> {product.size} {product.unit_type}</p>
            <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>Cost per Unit:</strong> ${product.cost_per_unit}</p>
            {sellingPrice && (
              <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>Selling Price:</strong> ${sellingPrice}</p>
            )}
            <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>Current Stock:</strong> {product.current_stock}</p>
            <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>Minimum Threshold:</strong> {product.min_threshold}</p>
            <p style={{ margin: '0 0 8px 0', color: '#666' }}><strong>Location:</strong> {product.location}</p>
          </div>
        </div>
        {product.description && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '600px' }}>
            <h3>Description</h3>
            <p style={{ margin: 0, lineHeight: '1.5' }}>{product.description}</p>
          </div>
        )}
      </div>
    </>
  )
}
