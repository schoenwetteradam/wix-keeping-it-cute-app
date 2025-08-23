export class WixAPIManager {
  constructor() {
    this.baseURL = 'https://www.wixapis.com'
    this.token = process.env.WIX_API_TOKEN
    this.siteId = process.env.WIX_SITE_ID
    this.bookingsAppId = process.env.WIX_BOOKINGS_APP_ID
    this.storesAppId = process.env.WIX_STORES_APP_ID
    this.ecommerceAppId = process.env.WIX_ECOMMERCE_APP_ID
  }

  getAppId(endpoint) {
    if (endpoint.startsWith('/bookings') || endpoint.startsWith('/calendar')) {
      return this.bookingsAppId
    }
    if (endpoint.startsWith('/stores')) {
      return this.storesAppId
    }
    if (endpoint.startsWith('/ecom')) {
      return this.ecommerceAppId
    }
    return null
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`
    const headers = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    }

    const appId = this.getAppId(endpoint)
    if (appId) headers['wix-app-id'] = appId
    if (this.siteId) headers['wix-site-id'] = this.siteId

    const options = { method, headers }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const res = await fetch(url, options)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Wix API Error: ${res.status} - ${text}`)
    }
    if (res.status === 204) return null
    return res.json()
  }

  async getServices() {
    return this.makeRequest('/bookings/v2/services')
  }

  async getSchedule(scheduleId) {
    return this.makeRequest(`/calendar/v3/schedules/${scheduleId}`)
  }

  async querySchedules(query = {}) {
    return this.makeRequest('/calendar/v3/schedules/query', 'POST', { query })
  }

  async createSchedule(schedule, idempotencyKey) {
    const body = { schedule }
    if (idempotencyKey) {
      body.idempotencyKey = idempotencyKey
    }
    return this.makeRequest('/calendar/v3/schedules', 'POST', body)
  }

  async updateSchedule(scheduleId, schedule, participantNotification) {
    const body = { schedule }
    if (participantNotification) {
      body.participantNotification = participantNotification
    }
    return this.makeRequest(`/calendar/v3/schedules/${scheduleId}`, 'PATCH', body)
  }

  async cancelSchedule(scheduleId, preserveFutureEventsWithParticipants = false, participantNotification) {
    const body = { preserveFutureEventsWithParticipants }
    if (participantNotification) {
      body.participantNotification = participantNotification
    }
    return this.makeRequest(`/calendar/v3/schedules/${scheduleId}/cancel`, 'POST', body)
  }

  // === Products ===
  async createProduct(product) {
    return this.makeRequest('/stores/v1/products', 'POST', { product })
  }

  async updateProduct(productId, product) {
    return this.makeRequest(`/stores/v1/products/${productId}`, 'PATCH', { product })
  }

  async updateInventory(wixProductId, quantity) {
    return this.makeRequest(`/stores/v1/inventoryItems/${wixProductId}`, 'PATCH', {
      inventoryItem: { quantity }
    })
  }

  // === Bookings ===
  async updateBooking(bookingId, booking) {
    return this.makeRequest(`/bookings/v1/bookings/${bookingId}`, 'PATCH', { booking })
  }
}
