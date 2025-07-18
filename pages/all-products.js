import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import slugify from '../utils/slugify'
import { fetchWithAuth } from '../utils/api'

const isWixImage = (url) => url && url.startsWith('wix:image://')
const getProductImageSrc = (product) => {
  if (!product.image_url || isWixImage(product.image_url)) {
    return `/images/products/${slugify(product.category)}/${slugify(product.product_name)}.svg`
  }
  return product.image_url.replace(/^\/?public/, '')
}

export default function AllProducts() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const handleProductClick = (product) => {
    router.push(`/products/${product.id}`)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (router.isReady && router.query.category) {
      setSelectedCategory(router.query.category)
    }
  }, [router.isReady, router.query.category])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth('/api/get-products')
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data.products || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

    const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
      <circle cx="${width/2}" cy="${height*0.35}" r="${Math.min(width, height)*0.12}" fill="#e0cdbb" opacity="0.6"/>
      <rect x="${width*0.3}" y="${height*0.55}" width="${width*0.4}" height="${height*0.3}" rx="8" fill="#eee4da" opacity="0.6"/>
      <text x="${width/2}" y="${height*0.7}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.06}" fill="#666">Product</text>
      <text x="${width/2}" y="${height*0.77}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(width, height)*0.05}" fill="#999">Image Coming Soon</text>
    </svg>`

    try {
      e.target.src = `data:image/svg+xml;base64,${btoa(svgContent)}`
      e.target.dataset.fallbackSet = 'true'
    } catch (encodingError) {
      e.target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`
      e.target.dataset.fallbackSet = 'true'
    }
  }

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      p.product_name.toLowerCase().includes(term) ||
      (p.brand || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading products...</h1>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>All Products - Keeping It Cute Salon</title>
      </Head>
      <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>📋 All Products</h1>
          <button
            onClick={() => router.push('/staff?tab=inventory')}
            style={{
              background: 'linear-gradient(135deg, #e0cdbb 0%, #eee4da 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Inventory
          </button>
        </div>

        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 2, padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}
          />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedCategory === cat ? '#e0cdbb' : '#f8f9fa',
                  color: selectedCategory === cat ? 'white' : '#333',
                  fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                  borderBottom: selectedCategory === cat ? '3px solid #e0cdbb' : '3px solid transparent'
                }}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
          <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>Products: {filteredProducts.length}</span>
        </div>

        {categories.filter(c => c !== 'all').map(category => {
          const categoryProducts = filteredProducts.filter(p => p.category === category)
          if (categoryProducts.length === 0) return null
          return (
            <div key={category} style={{ marginBottom: '25px' }}>
              <h3
                onClick={() => setSelectedCategory(category)}
                style={{ background: 'white', padding: '15px', borderRadius: '8px', margin: '0 0 15px 0', color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                {category} ({categoryProducts.length} items)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                {categoryProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    style={{
                      background: 'white',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '20px',
                      display: 'flex',
                      gap: '15px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
                      <img
                        src={getProductImageSrc(product)}
                        data-local-path={`/images/products/${slugify(product.category)}/${slugify(product.product_name)}.svg`}
                        alt={product.product_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={handleImageError}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1em', color: '#333' }}>{product.product_name}</h4>
                      <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '0.9em' }}>
                        {product.brand} - {product.size} {product.unit_type}
                      </p>
                      <p style={{ margin: '0', fontSize: '0.8em', color: '#888' }}>📍 {product.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
