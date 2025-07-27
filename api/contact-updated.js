import { createSupabaseClient } from '../utils/supabaseClient'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const contactData = req.body;
    console.log('📝 Contact Updated:', JSON.stringify(contactData, null, 2));

    const updateData = {
      email: contactData.info?.emails?.items?.[0]?.email || contactData.loginEmail,
      first_name: contactData.info?.name?.first,
      last_name: contactData.info?.name?.last,
      phone: contactData.info?.phones?.items?.[0]?.phone,
      birth_date: contactData.info?.birthdate,
      address: contactData.info?.addresses?.items?.[0],
      labels: contactData.info?.labelKeys,
      subscriber_status: contactData.info?.extendedFields?.emailSubscriptions?.deliverabilityStatus,
      payload: contactData,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('wix_contact_id', contactData.id)
      .select();

    if (error) {
      console.error('❌ Contact Update Error:', error);
      return res.status(500).json({ error: 'Failed to update contact', details: error.message });
    }

    console.log('✅ Contact Updated Successfully:', data);
    res.status(200).json({ status: 'Contact updated successfully', data });

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
