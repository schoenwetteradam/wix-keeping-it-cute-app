// api/update-product-image.js - Update product images
import { createSupabaseClient } from '../utils/supabaseClient'
import { setCorsHeaders } from '../utils/cors'

const supabase = createSupabaseClient()

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST, PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { product_id, image_url } = req.body;

    if (!product_id || !image_url) {
      return res.status(400).json({
        error: 'Missing required fields: product_id and image_url'
      });
    }

    // Update product with new image URL
    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update({
        image_url: image_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Image update error:', error);
      return res.status(500).json({
        error: 'Failed to update product image',
        details: error.message
      });
    }

    console.log('✅ Product image updated:', updatedProduct.id);

    res.status(200).json({
      success: true,
      message: 'Product image updated successfully',
      product: updatedProduct,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Image Update Error:', err);
    res.status(500).json({
      error: 'Unexpected error',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

