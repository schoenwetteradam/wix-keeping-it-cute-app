import { createSupabaseClient } from '../utils/supabaseClient'
import { WixAPIManager } from '../utils/wixApiManager'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, ['POST', 'GET'])
  
  try {
    const wix = new WixAPIManager()
    const servicesResponse = await wix.getServices()
    
    console.log(`Found ${servicesResponse.services.length} services from Wix`)
    
    // Try to import just the first service
    const firstService = servicesResponse.services[0]
    console.log('First service data:', JSON.stringify(firstService, null, 2))
    
    const serviceRecord = {
      wix_service_id: firstService.id,
      name: firstService.info?.name || 'Unknown Service',
      description: firstService.info?.description || null,
      duration: firstService.schedule?.duration || 60,
      price: firstService.payment?.pricing?.price?.value || 0,
      is_active: !firstService.hidden,
      category: 'beauty',
      color: '#E91E63'
    }
    
    console.log('Service record to insert:', JSON.stringify(serviceRecord, null, 2))
    
    const { data, error } = await supabase
      .from('salon_services')
      .upsert(serviceRecord, { onConflict: 'wix_service_id' })
      .select()
    
    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({
        success: false,
        error: 'Database insert failed',
        details: error.message,
        service_data: firstService,
        service_record: serviceRecord
      })
    }
    
    res.status(200).json({
      success: true,
      message: 'Test service import successful',
      wix_services_count: servicesResponse.services.length,
      first_service: firstService,
      inserted_record: data,
      service_record: serviceRecord
    })
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}