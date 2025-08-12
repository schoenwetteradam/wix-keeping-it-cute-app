/**
 * @jest-environment jsdom
 */
import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'

jest.mock('../utils/useRequireSupabaseAuth', () => () => ({ authError: null }))
jest.mock('../utils/useRequireRole', () => () => false)
jest.mock('../utils/fetchMetrics')
import { fetchMetrics } from '../utils/fetchMetrics'
import Dashboard from '../pages/dashboard.js'

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  root.unmount()
  document.body.removeChild(container)
  container = null
})

test('shows spinner while loading and displays metrics on success', async () => {
  let resolve
  fetchMetrics.mockReturnValue(new Promise((res) => (resolve = res)))

  await act(async () => {
    root.render(React.createElement(Dashboard))
  })
  expect(container.textContent).toContain('Loading...')

  await act(async () => {
    resolve({
      metrics: {
        upcomingAppointments: 1,
        usageFormsNeeded: 2,
        lowStock: 3,
        ordersToday: 4,
        totalRevenue: 5,
        appointmentCount: 6,
      },
      errors: [],
    })
  })

  expect(container.textContent).toContain('Upcoming Appointments')
  expect(container.textContent).not.toContain('Loading...')
})

test('shows error message if fetching fails', async () => {
  fetchMetrics.mockRejectedValue(new Error('fail'))

  await act(async () => {
    root.render(React.createElement(Dashboard))
  })

  // allow the rejected promise to be handled
  await act(async () => {})

  expect(container.textContent).toContain('Failed to load metrics.')
})

test('shows warning when some metrics fail', async () => {
  fetchMetrics.mockResolvedValue({
    metrics: {
      upcomingAppointments: 1,
      usageFormsNeeded: 2,
      lowStock: 3,
      ordersToday: 4,
      totalRevenue: 5,
      appointmentCount: 6,
    },
    errors: [{ view: 'metric_low_stock', error: 'x' }],
  })

  await act(async () => {
    root.render(React.createElement(Dashboard))
  })

  // wait for promises
  await act(async () => {})

  expect(container.textContent).toContain('Warning: Some metrics could not be loaded.')
})
