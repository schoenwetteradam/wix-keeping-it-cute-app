// pages/inventory-audit.js - Complete Inventory Audit System (No Email)
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function InventoryAudit() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [auditData, setAuditData] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [staffName, setStaffName] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/get-products')
      if (!response.ok) throw new Error('Failed to load products')
      
      const data = await response.json()
      const productsList = data.products || []
      setProducts(productsList)
      
      // Initialize audit data with current stock values
      const initialAuditData = {}
      productsList.forEach(product => {
        initialAuditData[product.id] = {
          audited_quantity: product.current_stock,
          notes: ''
        }
      })
      setAuditData(initialAuditData)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateAuditQuantity = (productId, quantity) => {
    setAuditData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        audited_quantity: quantity
      }
    }))
  }

  const updateAuditNotes = (productId, notes) => {
    setAuditData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        notes: notes
      }
    }))
  }

  const handleSubmitAudit = async () => {
    if (!staffName.trim()) {
      setError('Please enter staff member name')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Prepare audit data for submission
      const auditResults = products.map(product => ({
        product_id: product.id,
        product_name: product.product_name,
        brand: product.brand,
        sku: product.sku,
        category: product.category,
        location: product.location,
        current_system_stock: product.current_stock,
        audited_quantity: auditData[product.id]?.audited_quantity || 0,
        difference: (auditData[product.id]?.audited_quantity || 0) - product.current_stock,
        notes: auditData[product.id]?.notes || '',
        cost_per_unit: product.cost_per_unit
      }))

      // Calculate summary statistics
      const totalProducts = auditResults.length
      const discrepancies = auditResults.filter(item => item.difference !== 0)
      const totalDiscrepancyValue = discrepancies.reduce((sum, item) => 
        sum + Math.abs(item.difference * item.cost_per_unit), 0
      )

      const auditPayload = {
        staff_member: staffName.trim(),
        audit_date: new Date().toISOString(),
        total_products_audited: totalProducts,
        discrepancies_found: discrepancies.length,
        total_discrepancy_value: totalDiscrepancyValue,
        audit_results: auditResults,
        summary: {
          products_with_overages: auditResults.filter(item => item.difference > 0).length,
          products_with_shortages: auditResults.filter(item => item.difference < 0).length,
          products_accurate: auditResults.filter(item => item.difference === 0).length
        }
      }

      const response = await fetch('/api/submit-inventory-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditPayload)
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      setSuccess(true)
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/staff?tab=inventory')
      }, 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Loading inventory for audit...</h1>
      </div>
    )
  }

  if (success) {
    return (
      <>
        <Head>
          <title>Audit Submitted Successfully - Keeping It Cute Salon</title>
        </Head>
        <div style={{ 
          fontFamily: 'Arial, sans-serif', 
          backgroundColor: '#f8f9fa', 
          minHeight: '100vh',
          padding: '20px'
        }}>
          <div style={{ 
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            margin: '50px auto'
          }}>
            <div style={{ fontSize: '4em', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#28a745', marginBottom: '15px' }}>
              Inventory Audit Completed Successfully!
            </h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Your audit has been saved to the system.
            </p>
            <p style={{ color: '#666' }}>
              Redirecting back to inventory...
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Inventory Audit - Keeping It Cute Salon</title>
      </Head>

      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        backgroundColor: '#f8f9fa', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '25px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8em' }}>📊 Inventory Audit</h1>
              <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
                Complete physical count of all salon inventory
              </p>
            </div>
            <button
              onClick={() => router.back()}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back to Inventory
            </button>
          </div>
        </div>

        {/* Staff Information */}
        <div style={{ 
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Staff Information</h3>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                Staff Member Name *
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter your full name"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                Audit Date
              </label>
              <input
                type="text"
                value={new Date().toLocaleDateString()}
                readOnly
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa',
                  color: '#666'
                }}
              />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div style={{ 
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ flex: 2 }}>
              <input
                type="text"
                placeholder="Search products by name, brand, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', color: '#333' }}>
                Products: {filteredProducts.length}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '20px 20px 10px 20px',
            borderBottom: '1px solid #e9ecef'
          }}>
            <h3 style={{ margin: 0, color: '#333' }}>Product Audit Table</h3>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9em' }}>
              Enter the actual quantity found for each product during physical count
            </p>
          </div>

          <div style={{ overflow: 'auto', maxHeight: '600px' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead style={{ 
                backgroundColor: '#f8f9fa',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', minWidth: '200px' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', minWidth: '120px' }}>Brand</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', minWidth: '100px' }}>SKU</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: '100px' }}>Location</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: '100px' }}>System Stock</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: '120px' }}>Audited Qty</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: '100px' }}>Difference</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', minWidth: '200px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => {
                  const auditedQty = auditData[product.id]?.audited_quantity || 0
                  const difference = auditedQty - product.current_stock
                  
                  return (
                    <tr key={product.id} style={{ 
                      backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                      borderBottom: '1px solid #e9ecef'
                    }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#333' }}>
                        {product.product_name}
                        <div style={{ fontSize: '0.8em', color: '#666', marginTop: '2px' }}>
                          {product.size} {product.unit_type}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: '#666' }}>{product.brand}</td>
                      <td style={{ padding: '12px', color: '#666', fontFamily: 'monospace' }}>{product.sku}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#666' }}>{product.location}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                        {product.current_stock}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={auditedQty}
                          onChange={(e) => updateAuditQuantity(product.id, parseInt(e.target.value) || 0)}
                          style={{
                            width: '80px',
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '14px'
                          }}
                        />
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: difference === 0 ? '#28a745' : difference > 0 ? '#007bff' : '#dc3545'
                      }}>
                        {difference > 0 ? '+' : ''}{difference}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={auditData[product.id]?.notes || ''}
                          onChange={(e) => updateAuditNotes(product.id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Section */}
        <div style={{ 
          background: 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginTop: '20px'
        }}>
          {error && (
            <div style={{ 
              background: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>Ready to Submit Audit?</h4>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>
                This audit will be saved to the system for your records.
              </p>
            </div>
            <button
              onClick={handleSubmitAudit}
              disabled={submitting || !staffName.trim()}
              style={{
                background: submitting || !staffName.trim() ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '6px',
                cursor: submitting || !staffName.trim() ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: submitting || !staffName.trim() ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
            >
              {submitting ? 'Submitting Audit...' : 'Submit Inventory Audit'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
