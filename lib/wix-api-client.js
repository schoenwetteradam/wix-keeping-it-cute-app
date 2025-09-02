// lib/wix-api-client.js
// Provides a rate limited Wix API wrapper with retry logic

class WixAPIClient {
  constructor() {
    this.baseURL = 'https://www.wixapis.com';
    this.token = process.env.WIX_API_TOKEN;
    this.siteId = process.env.WIX_SITE_ID;
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  async makeRequest(endpoint, method = 'GET', data = null, retries = 3) {
    await this.rateLimitDelay();

    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': this.token,
        'wix-site-id': this.siteId,
        'Content-Type': 'application/json'
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 API Request (attempt ${attempt}): ${method} ${endpoint}`);
        const response = await fetch(url, options);

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || 5;
          console.log(`⏱️ Rate limited, waiting ${retryAfter}s...`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        console.log(`✅ API Success: ${endpoint}`);
        return result;
      } catch (error) {
        console.error(`❌ API Error (attempt ${attempt}):`, error.message);
        if (attempt === retries) {
          throw error;
        }
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  async rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 200) {
      await this.delay(200 - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const wixAPI = new WixAPIClient();

export default WixAPIClient;
