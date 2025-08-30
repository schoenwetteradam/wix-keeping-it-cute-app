export class WixAPIManager {
  constructor() {
    this.apiToken = process.env.WIX_API_TOKEN
    this.siteId = process.env.WIX_SITE_ID
    this.baseUrl = 'https://www.wixapis.com'
    
    if (!this.apiToken) {
      throw new Error('WIX_API_TOKEN is required')
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'wix-site-id': this.siteId,
        ...options.headers
      }
    }

    const response = await fetch(url, { ...defaultOptions, ...options })
    
    if (!response.ok) {
      throw new Error(`Wix API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Booking Methods
  async getBookings(params = {}) {
    const queryParams = new URLSearchParams({
      limit: params.limit || 50,
      cursor: params.cursor || '',
      includeDetails: params.includeDetails || true
    })

    return this.makeRequest(`/bookings/v1/bookings?${queryParams}`)
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

    return this.makeRequest(`/contacts/v4/contacts?${queryParams}`)
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

  // Order Methods
  async getOrders(params = {}) {
    const queryParams = new URLSearchParams({
      limit: params.limit || 50,
      cursor: params.cursor || '',
      includeDetails: params.includeDetails || true
    })

    return this.makeRequest(`/ecom/v1/orders?${queryParams}`)
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

  // Services Methods
  async getServices(params = {}) {
    return this.makeRequest('/bookings/v1/services', {
      method: 'GET'
    })
  }
}
