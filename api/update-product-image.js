// api/update-product-image.js - Update product images
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
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

// api/get-branding.js - Get salon branding info
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    console.log('🎨 Fetching salon branding...');
    
    // Get branding info
    const { data: branding, error } = await supabase
      .from('salon_branding')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Branding fetch error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch branding', 
        details: error.message 
      });
    }
    
    // If no branding found, return defaults
    const defaultBranding = {
      logo_url: '/images/logo/salon-logo.png',
      primary_color: '#ff9a9e',
      secondary_color: '#fecfef',
      salon_name: 'Keeping It Cute Salon & Spa',
      address: '144 E Oak St, Juneau, WI',
      phone: null,
      email: null,
      website: null
    };
    
    res.status(200).json({ 
      success: true,
      branding: branding || defaultBranding,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ Branding Error:', err);
    res.status(500).json({ 
      error: 'Unexpected error', 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

// api/upload-image.js - Simple image upload handler
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const form = formidable({
      uploadDir: './public/images/products',
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
    });
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }
      
      const file = files.image;
      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.originalFilename || '.jpg');
      const newFilename = `product-${timestamp}${ext}`;
      const newPath = path.join('./public/images/products', newFilename);
      
      // Move file to final location
      fs.renameSync(file.filepath, newPath);
      
      const imageUrl = `/images/products/${newFilename}`;
      
      // If product_id provided, update the product
      if (fields.product_id) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', fields.product_id);
        
        if (updateError) {
          console.error('Database update error:', updateError);
        }
      }
      
      res.status(200).json({
        success: true,
        image_url: imageUrl,
        filename: newFilename,
        message: 'Image uploaded successfully'
      });
    });
    
  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
}
