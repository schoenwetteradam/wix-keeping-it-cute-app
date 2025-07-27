export class WixAPIManager {
  constructor() {
    this.baseURL = 'https://www.wixapis.com'
    this.token = process.env.WIX_API_TOKEN
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseURL}${endpoint}`
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    }

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
}
