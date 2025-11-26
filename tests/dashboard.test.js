/**
 * @jest-environment jsdom
 */
import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'

jest.mock('../utils/useRequireSupabaseAuth', () => () => ({ authError: null }))
jest.mock('../utils/useRequireRole', () => () => false)
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => {
      const baseQuery = {
        select: jest.fn(() => baseQuery),
        gte: jest.fn(() => baseQuery),
        order: jest.fn(() => Promise.resolve({ data: [] })),
        eq: jest.fn(() => Promise.resolve({ data: [] }))
      }
      return baseQuery
    }
  })
}))

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

test('renders dashboard with metrics once data loads', async () => {
  await act(async () => {
    root.render(React.createElement(Dashboard))
  })

  await act(async () => {})

  expect(container.textContent).toContain('Manufacturing Tool Analytics')
  expect(container.textContent).toContain('Tool Changes Today')
  expect(container.textContent).not.toContain('Loading dashboard...')
})
