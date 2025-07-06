import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import slugify from '../../utils/slugify'
import { fetchWithAuth } from '../../utils/api'

const isWixImage = (url) => url && url.startsWith('wix:image://')
const getProductImageSrc = (product) => {
  if (!product.image_url || isWixImage(product.image_url)) {
    return `/images/products/${slugify(product.category)}/${slugify(product.product_name)}.svg`
  }
  return product.image_url.replace(/^\/?public/, '')
}

export default function ProductDetail() {
  const router = useRouter()
  const { productId } = router.query

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!productId) return

    const loadProduct = async () => {
      try {
        setLoading(true)
        const res = await fetchWithAuth(`/api/products/${productId}`)
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
  }, [productId])

  const handleImageError = (e) => {
    const localPath = e.target.dataset.localPath
    if (localPath && !e.target.dataset.localTried) {
      e.target.dataset.localTried = 'true'
      e.target.src = localPath
      return
    }

    const placeholder = '/images/products/placeholder.svg'
    if (!e.target.dataset.placeholderTried) {
      e.target.dataset.placeholderTried = 'true'
      e.target.src = placeholder
      return
    }

    if (e.target.dataset.fallbackSet === 'true') return

    const width = e.target.offsetWidth || 200
    const height = e.target.offsetHeight || 200

    const svgContent =
      `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${width}" height="${height}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>` +
      `<text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="Arial, sans-serif" font-size="14">No Image</text>` +
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
        {(() => {
          const localPath = `/images/products/${slugify(product.category)}/${slugify(product.product_name)}.svg`
          return (
            <img
              src={getProductImageSrc(product)}
              data-local-path={localPath}
              alt={product.product_name}
              style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', marginBottom: '20px' }}
              onError={handleImageError}
            />
          )
        })()}
        {product.description && (
          <p style={{ maxWidth: '600px', lineHeight: 1.5 }}>{product.description}</p>
        )}
        <p><strong>Brand:</strong> {product.brand}</p>
        <p><strong>Category:</strong> {product.category}</p>
        <p><strong>Size:</strong> {product.size} {product.unit_type}</p>
        <p><strong>SKU:</strong> {product.sku}</p>
        {product.selling_price !== undefined && (
          <p><strong>Selling Price:</strong> ${product.selling_price}</p>
        )}
        <p><strong>Cost per Unit:</strong> ${product.cost_per_unit}</p>
        <p><strong>Current Stock:</strong> {product.current_stock}</p>
        <p><strong>Minimum Threshold:</strong> {product.min_threshold}</p>
        <p><strong>Location:</strong> {product.location}</p>
      </div>
    </>
  )
}
