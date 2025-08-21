export const featureFlags = {
  useEdgeFunctions: process.env.ENABLE_EDGE_FUNCTIONS === 'true',
  fallbackToVercel: process.env.FALLBACK_TO_VERCEL === 'true',
  enhancedBooking: true,
  realtimeUpdates: true,
  advancedAnalytics: true,
}
