import { getWixRequestHeaders } from './wixAccessToken'

export class WixAPIManager {
  constructor() {
    this.siteId = process.env.WIX_SITE_ID
    this.accountId = process.env.WIX_ACCOUNT_ID
    this.baseUrl = 'https://www.wixapis.com'

    const hasApiToken = !!process.env.WIX_API_TOKEN
    const hasOAuthCredentials =
      !!(process.env.WIX_APP_ID || process.env.WIX_CLIENT_ID) &&
      !!(process.env.WIX_APP_SECRET || process.env.WIX_CLIENT_SECRET) &&
      !!(process.env.WIX_APP_INSTANCE_ID || process.env.WIX_INSTANCE_ID)

    if (!this.siteId) {
      throw new Error('WIX_SITE_ID is required')
    }

    if (!hasApiToken && !hasOAuthCredentials) {
      throw new Error(
        'Missing Wix credentials. Provide WIX_API_TOKEN or client credentials (WIX_APP_ID/WIX_CLIENT_ID, WIX_APP_SECRET/WIX_CLIENT_SECRET, WIX_APP_INSTANCE_ID/WIX_INSTANCE_ID).'
      )
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`

    const headers = await getWixRequestHeaders({
      'Content-Type': 'application/json',
      'wix-site-id': this.siteId,
      ...(options.headers || {}),
    })

    console.log(`Making request to: ${endpoint}`)

    const response = await fetch(url, { ...options, headers })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Wix API error ${response.status} for ${endpoint}:`, errorText)
      throw new Error(`Wix API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Success response from ${endpoint}:`, Object.keys(data))
    return data
  }

  // Booking Methods
  async getBookings(params = {}) {
    const limit = params.limit || 50
    const cursor = params.cursor || undefined

    const query = { filter: {}, paging: { limit } }
    if (cursor) query.cursor = cursor

    const headers = {}
    if (this.accountId) headers['wix-account-id'] = this.accountId

    const attempts = [
      () => this.makeRequest('/bookings/v1/bookings/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query })
      }),
      () => this.makeRequest('/bookings-reader/v1/bookings/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query })
      }),
      () => {
        const qs = new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) })
        return this.makeRequest(`/bookings/v1/bookings?${qs}`, { headers })
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        console.log(`Trying bookings API attempt ${i + 1}...`)
        const resp = await attempts[i]()
        console.log('Bookings API response keys:', Object.keys(resp))
        return resp
      } catch (e) {
        console.log(`Bookings API attempt ${i + 1} failed: ${e.message}`)
        if (i === attempts.length - 1) throw e
      }
    }
  }

  async createBooking(bookingData) {
    return this.makeRequest('/bookings/v1/bookings', {
      method: 'POST',
      body: JSON.stringify({ booking: bookingData })
    })
  }

  async updateBooking(bookingId, updateData) {
    return this.makeRequest(`/bookings/v1/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ booking: updateData })
    })
  }

  async cancelBooking(bookingId) {
    return this.makeRequest(`/bookings/v1/bookings/${bookingId}/cancel`, {
      method: 'POST'
    })
  }

  // Contact Methods
  async getContacts(params = {}) {
    const queryParams = new URLSearchParams({
      limit: params.limit || 50,
      cursor: params.cursor || ''
    })

    try {
      return await this.makeRequest(`/contacts/v4/contacts?${queryParams}`)
    } catch (v4Error) {
      console.log('Contacts v4 failed, trying v1...', v4Error.message)
      return await this.makeRequest(`/contacts/v1/contacts?${queryParams}`)
    }
  }

  async createContact(contactData) {
    return this.makeRequest('/contacts/v4/contacts', {
      method: 'POST',
      body: JSON.stringify({ contact: contactData })
    })
  }

  async updateContact(contactId, updateData) {
    return this.makeRequest(`/contacts/v4/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({ contact: updateData })
    })
  }

  // Order Methods - Try multiple endpoints
  async getOrders(params = {}) {
    const queryParams = new URLSearchParams({
      limit: params.limit || 50,
      cursor: params.cursor || ''
    })

    const attempts = [
      () => this.makeRequest(`/ecom/v1/orders?${queryParams}`),
      () => this.makeRequest(`/stores/v1/orders?${queryParams}`),
      () => this.makeRequest(`/stores/v2/orders?${queryParams}`)
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        console.log(`Trying orders API attempt ${i + 1}...`)
        const result = await attempts[i]()
        console.log(`Orders API attempt ${i + 1} succeeded`)
        return result
      } catch (error) {
        console.log(`Orders API attempt ${i + 1} failed:`, error.message)
        if (i === attempts.length - 1) {
          throw error
        }
      }
    }
  }

  // Product Methods
  async getProducts(params = {}) {
    const queryParams = new URLSearchParams({
      limit: params.limit || 50,
      cursor: params.cursor || '',
      includeVariants: params.includeVariants || false
    })

    return this.makeRequest(`/stores/v1/products?${queryParams}`)
  }

  async updateProduct(productId, updateData) {
    return this.makeRequest(`/stores/v1/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ product: updateData })
    })
  }

  async updateProductInventory(productId, inventoryData) {
    return this.makeRequest(`/stores/v1/products/${productId}/inventory`, {
      method: 'PATCH',
      body: JSON.stringify({ inventory: inventoryData })
    })
  }

  // Services Methods - Try multiple endpoints
  async getServices(params = {}) {
    const attempts = [
      () => this.makeRequest('/bookings/v1/services'),
      () => this.makeRequest('/bookings/v2/services'),
      () => this.makeRequest('/bookings-services/v1/services'),
      () => this.makeRequest('/services/v1/services')
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        console.log(`Trying services API attempt ${i + 1}...`)
        const result = await attempts[i]()
        console.log(`Services API attempt ${i + 1} succeeded`)
        return result
      } catch (error) {
        console.log(`Services API attempt ${i + 1} failed:`, error.message)
        if (i === attempts.length - 1) {
          throw error
        }
      }
    }
  }

  // Utility method to test API access
  async testConnection() {
    const tests = {
      services: false,
      bookings: false,
      contacts: false,
      orders: false
    }

    try {
      await this.getServices()
      tests.services = true
    } catch (e) {
      console.log('Services test failed:', e.message)
    }

    try {
      await this.getContacts({ limit: 1 })
      tests.contacts = true
    } catch (e) {
      console.log('Contacts test failed:', e.message)
    }

    try {
      await this.getBookings({ limit: 1 })
      tests.bookings = true
    } catch (e) {
      console.log('Bookings test failed:', e.message)
    }

    try {
      await this.getOrders({ limit: 1 })
      tests.orders = true
    } catch (e) {
      console.log('Orders test failed:', e.message)
    }

    return tests
  }
}
