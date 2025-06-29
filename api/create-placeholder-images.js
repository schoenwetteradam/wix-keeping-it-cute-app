// api/create-placeholder-images.js
// Run this once to create placeholder images programmatically
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  try {
    // Create all necessary directories
    const directories = [
      'public/images/placeholders',
      'public/images/products',
      'public/images/products/nail-care',
      'public/images/products/hair-care', 
      'public/images/products/skincare',
      'public/images/products/tools',
      'public/images/products/other',
      'public/images/services',
      'public/images/logo'
    ]

    const results = {
      directories_created: [],
      placeholders_created: [],
      errors: []
    }

    // Create directories
    for (const dir of directories) {
      const fullPath = path.join(process.cwd(), dir)
      try {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true })
          results.directories_created.push(dir)
        }
      } catch (error) {
        results.errors.push(`Failed to create ${dir}: ${error.message}`)
      }
    }

    // Create simple SVG placeholder images
    const placeholders = [
      { 
        name: 'product-placeholder.jpg', 
        dir: 'public/images/placeholders',
        svg: createProductPlaceholderSVG() 
      },
      { 
        name: 'service-placeholder.jpg', 
        dir: 'public/images/services',
        svg: createServicePlaceholderSVG() 
      },
      { 
        name: 'logo-placeholder.png', 
        dir: 'public/images/logo',
        svg: createLogoPlaceholderSVG() 
      }
    ]

    // Create placeholder files
    for (const placeholder of placeholders) {
      try {
        const filePath = path.join(process.cwd(), placeholder.dir, placeholder.name)
        
        // Write SVG content as a simple text file (browsers can display SVG)
        fs.writeFileSync(filePath.replace('.jpg', '.svg').replace('.png', '.svg'), placeholder.svg)
        
        // Also create a simple HTML file that can serve as an image fallback
        const htmlContent = `<!DOCTYPE html>
<html><head><style>
body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8f9fa;font-family:Arial,sans-serif;}
.placeholder{text-align:center;color:#666;font-size:14px;}
</style></head><body>
<div class="placeholder">
  ${placeholder.svg}
  <p>Placeholder Image</p>
</div>
</body></html>`
        
        fs.writeFileSync(filePath.replace('.jpg', '.html').replace('.png', '.html'), htmlContent)
        results.placeholders_created.push(placeholder.name)
        
      } catch (error) {
        results.errors.push(`Failed to create ${placeholder.name}: ${error.message}`)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Placeholder setup complete',
      results: results,
      next_steps: [
        'Replace .jpg/.png references with .svg in your code',
        'Or add actual image files to the placeholders directory',
        'Test image loading in your application'
      ]
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    })
  }
}

function createProductPlaceholderSVG() {
  return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
    <circle cx="100" cy="70" r="25" fill="#e0cdbb" opacity="0.6"/>
    <rect x="60" y="110" width="80" height="60" rx="8" fill="#eee4da" opacity="0.6"/>
    <text x="100" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">
      💅 Product
    </text>
    <text x="100" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">
      Image Coming Soon
    </text>
  </svg>`
}

function createServicePlaceholderSVG() {
  return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#fff3e0" stroke="#ffcc02" stroke-width="2"/>
    <circle cx="100" cy="70" r="30" fill="#e0cdbb" opacity="0.7"/>
    <path d="M70 110 Q100 90 130 110 Q100 130 70 110" fill="#eee4da" opacity="0.7"/>
    <text x="100" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">
      ✨ Service
    </text>
    <text x="100" y="165" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">
      Image Coming Soon
    </text>
  </svg>`
}

function createLogoPlaceholderSVG() {
  return `<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="100" fill="white" stroke="#e0cdbb" stroke-width="2"/>
    <text x="100" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#e0cdbb">
      💅 Keeping It Cute
    </text>
    <text x="100" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">
      Salon & Spa
    </text>
    <text x="100" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">
      Logo Coming Soon
    </text>
  </svg>`
}
