import { useState, useEffect } from 'react'
import Head from 'next/head'
import { fetchWithAuth } from '../utils/api'

// Available Wix Analytics reports. Admin or staff can run any of these
// measurement types through the metrics page.
const MEASUREMENTS = [
  // Existing basic metrics
  'TOTAL_UNIQUE_VISITORS',
  'TOTAL_FORMS_SUBMITTED',
  'TOTAL_SESSIONS',
  'CLICKS_TO_CONTACT',
  'TOTAL_ORDERS',
  'TOTAL_SALES',

  // Payments / Sales reports
  'SALES_OVER_TIME',
  'SALES_BY_ITEM',
  'ITEM_SALES_OVER_TIME',

  // Traffic reports
  'TRAFFIC_OVER_TIME',
  'TRAFFIC_BY_TIME_OF_DAY',
  'TRAFFIC_BY_ENTRY_PAGE',
  'TRAFFIC_BY_LOCATION',
  'TRAFFIC_BY_DEVICE',
  'NEW_VS_RETURNING_VISITORS',

  // Store analytics
  'SALES_BY_PRODUCT_VARIANT',
  'INVENTORY_SNAPSHOT',
  'STORE_CONVERSION_FUNNEL',
  'STORE_CONVERSION_FUNNEL_OVER_TIME',
  'CONVERSION_BY_PRODUCT',
  'MOST_ABANDONED_PRODUCTS',
  'ABANDONED_CARTS_FUNNEL',
  'ABANDONED_CARTS_FUNNEL_OVER_TIME',
  'ABANDONED_CARTS_SUMMARY',
  'SALES_BY_SHIPPING_METHOD',
  'INVENTORY_PLANNING',
  'LOW_INVENTORY',
  'SLOW_MOVING_INVENTORY',
  'INVENTORY_OVER_TIME',
  'SALES_BY_PRODUCT_CATEGORY',

  // Booking analytics
  'BOOKINGS_OVER_TIME',
  'TOP_CLIENTS_BY_BOOKINGS_MADE',
  'TOP_CLIENTS_BY_SESSIONS_JOINED',

  // Subscription analytics
  'ACTIVE_SUBSCRIPTIONS',
  'NEW_SUBSCRIPTIONS_OVER_TIME',
  'SUBSCRIPTION_REVENUE_OVER_TIME',
  'REVENUE_BY_SUBSCRIPTION',
  'NEW_SUBSCRIPTIONS',
  'EXPECTED_REVENUE_FROM_RECURRING_PAYMENTS',
  'ACTIVE_SUBSCRIPTIONS_OVER_TIME',
  'EXPIRING_SUBSCRIPTIONS',
  'RETENTION_OVER_TIME',
  'ENDED_SUBSCRIPTIONS_BREAKDOWN',

  // Blog analytics
  'BLOG_ACTIVITY_OVER_TIME',
  'TOP_BLOG_POSTS',
  'BLOG_ACTIVITY_BY_TIME_OF_DAY',
  'BLOG_TRAFFIC_SOURCES',

  // Marketing analytics
  'TOP_TRAFFIC_SOURCES',
  'ORDER_CONVERSION_BY_TRAFFIC_SOURCE',
  'TRAFFIC_CATEGORIES_OVER_TIME',
  'FORM_SUBMISSIONS_BY_TRAFFIC_SOURCE',
  'EMAIL_PERFORMANCE',
  'CLICK_TO_CONTACT_RATE_BY_TRAFFIC_SOURCE',
  'EMAIL_ENGAGEMENT_OVER_TIME',
  'PAID_AD_CAMPAIGNS_OVER_TIME',
  'TOP_PAID_AD_CAMPAIGNS',
  'EMAIL_CLICKS',

  // SEO analytics
  'GOOGLE_SEARCH_PERFORMANCE_OVER_TIME',
  'TOP_SEARCH_QUERIES_ON_GOOGLE',
  'TOP_PAGES_IN_GOOGLE_SEARCH_RESULTS',

  // Behaviour analytics
  'BUTTON_CLICKS',
  'PAGE_VISITS',
  'SUBMISSIONS_BY_FORM',
  'TOP_SEARCHES',
  'ORDER_CONVERSION_OVER_TIME',
  'CLICKS_TO_CONTACT_OVER_TIME',
  'SEARCHES_OVER_TIME',
  'SEARCHES_WITH_NO_RESULTS',
  'FORM_SUBMISSIONS_OVER_TIME',
  'BUTTON_CLICKS_OVER_TIME',

  // Mobile apps analytics
  'APP_TRAFFIC_OVER_TIME',
  'NEW_APP_VISITORS_OVER_TIME',
  'APP_TRAFFIC_BY_TIME_OF_DAY',

  // People analytics
  'TOP_PAYING_CUSTOMERS',
  'CUSTOMERS_OVER_TIME',
  'NEW_VS_RETURNING_CUSTOMERS',
  'CONTACTS_OVER_TIME',
  'FORM_LEADS',
  'CONTACTS_BY_SOURCE',
  'PAYING_SUBSCRIBERS_OVER_TIME',
  'NEW_SUBSCRIBERS',

  // Accounting reports
  'TAX_SUMMARY',
  'TRANSACTIONS_SUMMARY',
  'FEES_SUMMARY',
  'STORE_SALES_SUMMARY',
  'CLIENTS_WITH_OVERDUE_PAYMENTS'
]

export default function SiteAnalytics() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selected, setSelected] = useState(['TOTAL_SESSIONS'])
  const [data, setData] = useState([])
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      setError('')
      const params = new URLSearchParams()
      if (startDate) params.append('date_range.start_date', startDate)
      if (endDate) params.append('date_range.end_date', endDate)
      selected.forEach((m) => params.append('measurement_types', m))
      const res = await fetchWithAuth(`/api/get-site-analytics?${params.toString()}`)
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }
      const json = await res.json()
      setData(json.data || [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleMeasurement = (m) => {
    setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  return (
    <>
      <Head>
        <title>Site Analytics</title>
      </Head>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Site Analytics</h1>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>
            Start Date:
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label style={{ marginRight: '10px' }}>
            End Date:
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <div style={{ marginBottom: '20px' }}>
          {MEASUREMENTS.map((m) => (
            <label key={m} style={{ marginRight: '15px' }}>
              <input type="checkbox" checked={selected.includes(m)} onChange={() => toggleMeasurement(m)} />{' '}
              {m}
            </label>
          ))}
        </div>
        <button onClick={loadData} style={{ padding: '8px 16px', marginBottom: '20px' }}>
          Run Query
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {data.map((item) => (
          <div key={item.type} style={{ marginBottom: '20px' }}>
            <h3>{item.type}</h3>
            <p>Total: {item.total}</p>
            <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {item.values.map((v) => (
                  <tr key={v.date}>
                    <td>{v.date}</td>
                    <td>{v.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  )
}
