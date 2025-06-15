// api/fix-missing-images.js
// Run this ONCE to create all missing placeholder files
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  try {
    const results = {
      created: [],
      errors: [],
      directories: []
    }

    // Ensure all directories exist
    const dirs = [
      'public/images',
      'public/images/placeholders', 
      'public/images/products',
      'public/images/services',
      'public/images/branding'
    ]

    for (const dir of dirs) {
      const fullPath = path.join(process.cwd(), dir)
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
        results.directories.push(dir)
      }
    }

    // Create the main placeholder image that's causing 404s
    const placeholderPath = path.join(process.cwd(), 'public/images/placeholders/product-placeholder.jpg')
    
    // Create a simple HTML file that acts as an image
    const placeholderHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; display: flex; align-items: center; justify-content: center; 
               height: 200px; width: 200px; background: #f8f9fa; font-family: Arial, sans-serif; 
               border: 2px dashed #dee2e6; box-sizing: border-box; }
        .content { text-align: center; color: #666; }
        .icon { font-size: 30px; margin-bottom: 10px; }
        .text { font-size: 12px; }
    </style>
</head>
<body>
    <div class="content">
        <div class="icon">💅</div>
        <div class="text">Product Image<br/>Coming Soon</div>
    </div>
</body>
</html>`

    // Create simple SVG placeholder
    const placeholderSVG = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
      <circle cx="100" cy="70" r="25" fill="#ff9a9e" opacity="0.6"/>
      <rect x="60" y="110" width="80" height="60" rx="8" fill="#fecfef" opacity="0.6"/>
      <text x="100" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">💅 Product</text>
      <text x="100" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#999">Image Coming Soon</text>
    </svg>`

    // Write the files
    const files = [
      { path: 'public/images/placeholders/product-placeholder.jpg', content: placeholderHTML },
      { path: 'public/images/placeholders/product-placeholder.svg', content: placeholderSVG },
      { path: 'public/images/products/placeholder.jpg', content: placeholderHTML },
      { path: 'public/images/products/placeholder.svg', content: placeholderSVG },
      { path: 'public/images/services/placeholder.jpg', content: placeholderHTML },
      { path: 'public/favicon.ico', content: placeholderHTML } // Fallback favicon
    ]

    for (const file of files) {
      try {
        const fullPath = path.join(process.cwd(), file.path)
        fs.writeFileSync(fullPath, file.content)
        results.created.push(file.path)
      } catch (error) {
        results.errors.push(`Failed to create ${file.path}: ${error.message}`)
      }
    }

    // Also create a simple index.html in public for debugging
    const debugHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Keeping It Cute - Image Debug</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .image-test { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        img { margin: 10px; border: 1px solid #ccc; }
    </style>
</head>
<body>
    <h1>🔧 Image System Test</h1>
    <div class="image-test">
        <h3>Placeholder Images</h3>
        <img src="/images/placeholders/product-placeholder.svg" alt="Product SVG" width="100" height="100">
        <img src="/images/placeholders/product-placeholder.jpg" alt="Product HTML" width="100" height="100">
        <img src="/images/products/placeholder.svg" alt="Products SVG" width="100" height="100">
    </div>
    <div class="image-test">
        <h3>Directory Status</h3>
        <p>If you can see placeholder images above, the system is working!</p>
        <p>Created: ${results.created.length} files</p>
        <p>Directories: ${results.directories.length} created</p>
    </div>
</body>
</html>`

    fs.writeFileSync(path.join(process.cwd(), 'public/image-test.html'), debugHTML)
    results.created.push('public/image-test.html')

    res.status(200).json({
      success: true,
      message: 'Missing images fixed!',
      results: results,
      test_url: `${req.headers.host}/image-test.html`,
      next_steps: [
        '1. Visit /image-test.html to verify images work',
        '2. Update your React components to use the new error handler',
        '3. Test uploading new product images',
        '4. Replace placeholder images with real ones when ready'
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
