import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionData = req.body;
    console.log('⏹️ Session Ended:', JSON.stringify(sessionData, null, 2));

    const sessionRecord = {
      session_id: sessionData.sessionId || sessionData.id,
      visitor_id: sessionData.visitorId || sessionData.userId,
      duration: sessionData.duration || sessionData.sessionDuration,
      pages_viewed: sessionData.pagesViewed || sessionData.pageViews,
      source: sessionData.source || sessionData.referrer,
      device_type: sessionData.deviceType || sessionData.device,
      ended_at: sessionData.endTime || new Date().toISOString(),
      payload: sessionData
    };

    // Remove undefined values
    Object.keys(sessionRecord).forEach(key => {
      if (sessionRecord[key] === undefined) delete sessionRecord[key];
    });

    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionRecord])
      .select();

    if (error) {
      console.error('❌ Session Insert Error:', error);
      return res.status(500).json({ error: 'Failed to store session', details: error.message });
    }

    console.log('✅ Session Stored Successfully:', data);
    res.status(200).json({ status: 'Session stored successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
