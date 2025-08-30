import { createSupabaseClient } from '../utils/supabaseClient'
import { WixAPIManager } from '../utils/wixApiManager'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET')
  
  try {
    const wix = new WixAPIManager()
    const servicesResponse = await wix.getServices()
    
    // Get first service
    const firstService = servicesResponse.services[0]
    
    // Try to insert it
    const serviceRecord = {
      wix_service_id: firstService.id,
      name: firstService.info?.name || 'Test Service',
      description: firstService.info?.description || 'Test Description',
      duration_minutes: firstService.schedule?.duration || 60,
      price: firstService.payment?.pricing?.price?.value || 0,
      category: firstService.info?.category || 'beauty',
      is_active: true
    }
    
    const { data, error } = await supabase
      .from('salon_services')
      .insert([serviceRecord])
      .select()
    
    res.json({
      wix_service_data: firstService,
      service_record: serviceRecord,
      insert_result: data,
      insert_error: error,
      total_services_from_wix: servicesResponse.services.length
    })
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}