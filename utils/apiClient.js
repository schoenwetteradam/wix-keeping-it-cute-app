class APIClient {
  constructor() {
    this.baseURL =
      process.env.NODE_ENV === 'production'
        ? 'https://your-app.vercel.app'
        : 'http://localhost:3000'
    this.edgeFunctionURL =
      process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1'
  }

  async getBookings(params = {}) {
    const response = await fetch(
      `${this.baseURL}/api/get-bookings?${new URLSearchParams(params)}`
    )
    return response.json()
  }

  async getBookingAnalytics(params = {}) {
    const response = await fetch(
      `${this.edgeFunctionURL}/booking-operations?action=analytics&${new URLSearchParams(params)}`
    )
    return response.json()
  }

  async checkAvailability(params = {}) {
    try {
      const response = await fetch(
        `${this.baseURL}/api/booking-operations-enhanced?action=check-availability-enhanced&${new URLSearchParams(
          params
        )}`
      )
      return response.json()
    } catch (error) {
      const response = await fetch(
        `${this.baseURL}/api/query-availability?${new URLSearchParams(params)}`
      )
      return response.json()
    }
  }
}

export const apiClient = new APIClient()
