import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import slugify from '../../utils/slugify'
import { fetchWithAuth } from '../../utils/api'

export default function ServiceDetail() {
  const router = useRouter()
  const { serviceId } = router.query

  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!serviceId) return

    const loadService = async () => {
      try {
        setLoading(true)
        // Fetch the service along with related staff and products
        const res = await fetchWithAuth(`/api/services/${serviceId}`)
        if (!res.ok) throw new Error('Failed to load service')
        const data = await res.json()
        setService(data.service)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadService()
  }, [serviceId])

  const handleImageError = (e) => {
    const localPath = e.target.dataset.localPath
    if (localPath && !e.target.dataset.localTried) {
      e.target.dataset.localTried = 'true'
      e.target.src = localPath
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
        <h1>Loading service...</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Error Loading Service</h1>
        <p>{error}</p>
      </div>
    )
  }

  if (!service) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Service not found</h1>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{service.name}</title>
      </Head>
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          background:
            'linear-gradient(135deg, #fdfdfd 0%, #c097d2 40%, #9f84ca 70%, #efc315 100%)',
          minHeight: '100vh',
          padding: '20px'
        }}
      >
        <button onClick={() => router.back()} style={{ marginBottom: '20px' }}>← Back</button>
        <h1 style={{ marginTop: 0 }}>{service.name}</h1>
        {(() => {
          const localPath = `/images/services/${slugify(service.name)}.svg`
          return (
            <img
              src={service.image_url || localPath}
              data-local-path={localPath}
              alt={service.name}
              style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', marginBottom: '20px' }}
              onError={handleImageError}
            />
          )
        })()}
        {service.description && (
          <p style={{ maxWidth: '600px', lineHeight: 1.5 }}>{service.description}</p>
        )}
        <p><strong>Price:</strong> ${service.price}</p>
        <p><strong>Duration:</strong> {service.duration_minutes} minutes</p>

        {service.staff && service.staff.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>Available Staff</h3>
            <ul>
              {service.staff.map((member) => (
                <li key={member.id}>{member.name}</li>
              ))}
            </ul>
          </div>
        )}

        {service.products && service.products.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>Products Used</h3>
            <ul>
              {service.products.map((product) => (
                <li key={product.id}>{product.product_name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
