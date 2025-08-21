import { featureFlags } from './featureFlags'

export async function callAPI(endpoint, options = {}) {
  const { useEdge = false, fallback = true, params, ...fetchOptions } = options
  const query = params ? `?${new URLSearchParams(params)}` : ''

  if (useEdge && featureFlags.useEdgeFunctions) {
    try {
      const edgeResponse = await fetch(
        `${process.env.SUPABASE_EDGE_FUNCTIONS_URL}/${endpoint}${query}`,
        {
          ...fetchOptions,
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            ...(fetchOptions.headers || {}),
          },
        }
      )

      if (edgeResponse.ok) {
        return edgeResponse.json()
      }

      if (!fallback) throw new Error('Edge function failed')
    } catch (error) {
      console.warn('Edge function failed, trying fallback:', error.message)
    }
  }

  const vercelResponse = await fetch(`/api/${endpoint}${query}`, fetchOptions)
  return vercelResponse.json()
}
