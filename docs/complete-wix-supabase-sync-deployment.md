# Complete Wix ↔ Supabase Sync Deployment Guide

## 🚀 Quick Start - Run Full Sync

### 1. Deploy the Sync API
First, ensure the sync API endpoint is deployed to your Vercel project:

```bash
# Deploy to production
vercel --prod

# Or test locally first
npm run dev
```

### 2. Run Complete Historical Sync
Execute a full sync of all your existing Wix data:

```bash
# Sync all data types
curl -X POST https://your-app.vercel.app/api/sync-all-wix-data \
  -H "Content-Type: application/json" \
  -d '{
    "tables": ["all"],
    "batchSize": 100,
    "skipExisting": true
  }'

# Or sync specific tables only
curl -X POST https://your-app.vercel.app/api/sync-all-wix-data \
  -H "Content-Type: application/json" \
  -d '{
    "tables": ["bookings", "contacts", "orders"],
    "batchSize": 50,
    "skipExisting": false
  }'
```

## 📋 Pre-Sync Checklist

### Required Environment Variables
Ensure these are set in both `.env.local` and Vercel:

```bash
# Supabase Configuration
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Wix API Configuration
WIX_API_TOKEN=your-wix-api-token
WIX_SITE_ID=your-wix-site-id
WIX_ACCOUNT_ID=your-wix-account-id
WIX_WEBHOOK_SECRET=your-webhook-secret

# Wix App IDs (from Wix Developer Center)
WIX_BOOKINGS_APP_ID=13d21c63-b5ec-5912-8397-c3a5ddb27a97
WIX_STORES_APP_ID=215238eb-22a5-4c36-9e7b-e7c08025e04e
WIX_ECOMMERCE_APP_ID=1380b703-ce81-ff05-f115-39571d94dfcd

# Security
WEBHOOK_SECRET=your-supabase-webhook-auth-token
```

### Database Preparation
Run these SQL commands in your Supabase dashboard:

```sql
-- Add sync tracking columns if not exists
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create sync status tracking table
CREATE TABLE IF NOT EXISTS sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type TEXT NOT NULL,
  tables_synced TEXT[],
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  results JSONB,
  error_message TEXT
);

-- Create indexes for better sync performance
CREATE INDEX IF NOT EXISTS idx_bookings_wix_id ON bookings(wix_booking_id);
CREATE INDEX IF NOT EXISTS idx_contacts_wix_id ON contacts(wix_contact_id);  
CREATE INDEX IF NOT EXISTS idx_orders_wix_id ON orders(wix_order_id);
CREATE INDEX IF NOT EXISTS idx_products_wix_id ON products(wix_product_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sync_status ON bookings(sync_status);
```

## 🔄 Sync Options & Strategies

### Option 1: Full Initial Sync (Recommended)
**Best for:** First-time setup or major data refresh

```javascript
{
  "tables": ["all"],
  "batchSize": 100,
  "skipExisting": false  // Overwrites existing records
}
```

### Option 2: Incremental Sync
**Best for:** Regular maintenance after initial sync

```javascript
{
  "tables": ["bookings", "contacts", "orders"],
  "batchSize": 50,
  "skipExisting": true  // Only adds new records
}
```

### Option 3: Specific Entity Sync
**Best for:** Targeted fixes or specific data types

```javascript
{
  "tables": ["loyalty"],  // Just loyalty points
  "batchSize": 25,
  "skipExisting": false
}
```

## 📊 Monitoring & Validation

### Real-Time Sync Monitoring
Check sync progress in your webhook logs:

```sql
-- View recent sync operations
SELECT 
  event_type,
  webhook_status,
  data->>'sync_results' as results,
  logged_at
FROM webhook_logs 
WHERE event_type LIKE '%sync%'
ORDER BY logged_at DESC
LIMIT 10;
```

### Data Integrity Validation
Run these queries after sync completion:

```sql
-- Check relationship linking success rates
SELECT 
  'Bookings' as table_name,
  COUNT(*) as total_records,
  COUNT(customer_id) as linked_customers,
  COUNT(service_id) as linked_services,
  COUNT(staff_id) as linked_staff,
  ROUND(COUNT(customer_id)::float / COUNT(*) * 100, 1) as customer_link_rate
FROM bookings
WHERE sync_status = 'synced'

UNION ALL

SELECT 
  'Orders' as table_name,
  COUNT(*) as total_records,
  COUNT(customer_id) as linked_customers,
  NULL as linked_services,
  NULL as linked_staff,
  ROUND(COUNT(customer_id)::float / COUNT(*) * 100, 1) as customer_link_rate
FROM orders
WHERE sync_status = 'synced';
```

### Orphaned Records Report
```sql
-- Find records that failed to link properly
SELECT 
  'bookings' as table_type,
  COUNT(*) as orphaned_count,
  string_agg(DISTINCT customer_email, ', ') as sample_emails
FROM bookings 
WHERE customer_id IS NULL 
  AND customer_email IS NOT NULL
  AND sync_status = 'synced'

UNION ALL

SELECT 
  'orders' as table_type,
  COUNT(*) as orphaned_count,
  string_agg(DISTINCT customer_email, ', ') as sample_emails
FROM orders 
WHERE customer_id IS NULL 
  AND customer_email IS NOT NULL
  AND sync_status = 'synced';
```

## 🔧 Advanced Sync Configuration

### Custom Sync Script (Node.js)
Create `scripts/sync-wix-data.js` for more control:

```javascript
#!/usr/bin/env node
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SYNC_URL = process.env.SYNC_URL || 'http://localhost:3000/api/sync-all-wix-data'

async function runSync(options = {}) {
  const defaultOptions = {
    tables: ['all'],
    batchSize: 100,
    skipExisting: true
  }
  
  const syncOptions = { ...defaultOptions, ...options }
  
  console.log('🚀 Starting Wix sync with options:', syncOptions)
  
  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncOptions)
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Sync completed successfully!')
      console.table(result.results)
    } else {
      console.error('❌ Sync failed:', result.error)
    }
    
    return result
  } catch (error) {
    console.error('❌ Sync request failed:', error.message)
    throw error
  }
}

// Run with command line arguments
const args = process.argv.slice(2)
const tables = args.includes('--tables') 
  ? args[args.indexOf('--tables') + 1]?.split(',') || ['all']
  : ['all']
const batchSize = args.includes('--batch-size')
  ? parseInt(args[args.indexOf('--batch-size') + 1]) || 100
  : 100
const skipExisting = !args.includes('--overwrite')

runSync({ tables, batchSize, skipExisting })
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
```

**Usage:**
```bash
# Full sync
node scripts/sync-wix-data.js

# Specific tables
node scripts/sync-wix-data.js --tables bookings,contacts

# Overwrite existing records
node scripts/sync-wix-data.js --overwrite

# Custom batch size
node scripts/sync-wix-data.js --batch-size 50
```

## 🕐 Scheduled Sync Setup

### Option 1: Vercel Cron Jobs
Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync-all-wix-data",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Option 2: GitHub Actions
Create `.github/workflows/sync-wix-data.yml`:

```yaml
name: Daily Wix Data Sync
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST ${{ secrets.SYNC_ENDPOINT }} \
            -H "Content-Type: application/json" \
            -d '{"tables": ["all"], "batchSize": 100, "skipExisting": true}'
```

### Option 3: Supabase Edge Functions
Create a Supabase Edge Function for scheduled sync:

```javascript
// supabase/functions/scheduled-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const syncResponse = await fetch('https://your-app.vercel.app/api/sync-all-wix-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tables: ['bookings', 'contacts', 'orders'],
      batchSize: 100,
      skipExisting: true
    })
  })
  
  const result = await syncResponse.json()
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## 🛠️ Troubleshooting Common Issues

### Issue 1: Rate Limiting
**Problem:** Wix API returns 429 errors
**Solution:** Add rate limiting to your sync:

```javascript
// Add to your sync functions
await delay(1000) // 1 second between requests
```

### Issue 2: Large Dataset Timeouts
**Problem:** Vercel function timeout (10 seconds)
**Solution:** Use smaller batch sizes or queue-based sync:

```javascript
{
  "tables": ["bookings"],
  "batchSize": 25,  // Smaller batches
  "skipExisting": true
}
```

### Issue 3: Relationship Linking Failures
**Problem:** Foreign keys remain null
**Solution:** Run a cleanup script after initial sync:

```sql
-- Update bookings with missing customer links
UPDATE bookings SET customer_id = c.id
FROM contacts c 
WHERE bookings.customer_id IS NULL 
  AND bookings.customer_email = c.email;

-- Update bookings with missing service links  
UPDATE bookings SET service_id = s.id
FROM salon_services s
WHERE bookings.service_id IS NULL
  AND bookings.service_name ILIKE '%' || s.name || '%';
```

### Issue 4: Duplicate Prevention
**Problem:** Running sync multiple times creates duplicates
**Solution:** Always use `skipExisting: true` for incremental syncs

## 📈 Performance Optimization

### Batch Size Guidelines
- **Small datasets** (< 1,000 records): `batchSize: 100`
- **Medium datasets** (1,000-10,000 records): `batchSize: 50`  
- **Large datasets** (> 10,000 records): `batchSize: 25`

### Parallel Processing
For very large datasets, consider running table syncs in parallel:

```bash
# Run multiple syncs simultaneously
curl -X POST /api/sync-all-wix-data -d '{"tables": ["bookings"]}' &
curl -X POST /api/sync-all-wix-data -d '{"tables": ["contacts"]}' &
curl -X POST /api/sync-all-wix-data -d '{"tables": ["orders"]}' &
wait
```

## 🔍 Post-Sync Validation Checklist

### 1. Record Counts Match
```sql
-- Compare Supabase vs Wix record counts
SELECT 
  'bookings' as table_name,
  COUNT(*) as supabase_count
FROM bookings
WHERE sync_status = 'synced'

UNION ALL

SELECT 
  'contacts' as table_name,
  COUNT(*) as supabase_count  
FROM contacts
WHERE sync_status = 'synced';
```

### 2. Critical Fields Populated
```sql
-- Ensure no critical nulls
SELECT 
  COUNT(*) FILTER (WHERE customer_email IS NULL) as missing_emails,
  COUNT(*) FILTER (WHERE service_name IS NULL) as missing_services,
  COUNT(*) FILTER (WHERE appointment_date IS NULL) as missing_dates,
  COUNT(*) FILTER (WHERE total_price IS NULL) as missing_prices
FROM bookings 
WHERE sync_status = 'synced';
```

### 3. Relationship Integrity
```sql
-- Check foreign key success rates
SELECT 
  ROUND(COUNT(customer_id)::float / COUNT(*) * 100, 1) as customer_link_rate,
  ROUND(COUNT(service_id)::float / COUNT(*) * 100, 1) as service_link_rate,
  ROUND(COUNT(staff_id)::float / COUNT(*) * 100, 1) as staff_link_rate
FROM bookings 
WHERE sync_status = 'synced';
```

## 🔄 Ongoing Sync Maintenance

### Daily Incremental Sync
Set up automated daily syncs for new/updated records:

```javascript
// Daily sync configuration
{
  "tables": ["bookings", "contacts", "orders"],
  "batchSize": 100,
  "skipExisting": true,
  "dateFilter": "last_24_hours"  // Only sync recent changes
}
```

### Weekly Full Validation
Run comprehensive validation weekly:

```bash
# Weekly full validation sync
curl -X POST /api/sync-all-wix-data \
  -d '{"tables": ["all"], "batchSize": 50, "skipExisting": false}'
```

### Monthly Deep Sync
Complete refresh monthly for data integrity:

```bash
# Monthly complete refresh
curl -X POST /api/sync-all-wix-data \
  -d '{"tables": ["all"], "batchSize": 25, "skipExisting": false}'
```

## 📊 Expected Sync Timeline

### Initial Historical Sync
- **Small salon** (< 1,000 bookings): 5-10 minutes
- **Medium salon** (1,000-5,000 bookings): 15-30 minutes  
- **Large salon** (> 5,000 bookings): 30-60 minutes

### Daily Incremental Sync
- **Typical daily volume**: 1-2 minutes
- **High-volume days**: 3-5 minutes

## 🚨 Critical Success Metrics

After running the sync, validate these key metrics:

### Data Completeness
- ✅ **95%+** of bookings have `customer_id` linked
- ✅ **90%+** of bookings have `service_id` linked  
- ✅ **80%+** of bookings have `staff_id` linked
- ✅ **100%** of orders have valid `total_amount`
- ✅ **95%+** of contacts have email addresses

### Relationship Integrity
- ✅ No orphaned bookings (customer_id missing)
- ✅ All service references resolve to valid services
- ✅ Staff assignments match actual staff records
- ✅ Order-booking links established where applicable

### Business Logic Validation
- ✅ Revenue totals match between Wix and Supabase
- ✅ Appointment counts align across systems
- ✅ Customer contact information is consistent
- ✅ Product inventory levels are synchronized

## 🔧 Advanced Sync Features

### Selective Date Range Sync
Sync only specific time periods:

```javascript
{
  "tables": ["bookings"],
  "batchSize": 100,
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  }
}
```

### Conflict Resolution Strategy
Handle data conflicts intelligently:

```javascript
{
  "conflictResolution": "wix_wins",  // or "supabase_wins", "merge"
  "preserveLocalChanges": false,
  "backupBeforeSync": true
}
```

### Sync Status Dashboard
Monitor sync health with this query:

```sql
-- Sync health dashboard
SELECT 
  table_name,
  total_records,
  synced_records,
  failed_records,
  last_sync_time,
  sync_success_rate
FROM (
  SELECT 
    'bookings' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_records,
    COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_records,
    MAX(last_synced_at) as last_sync_time,
    ROUND(COUNT(*) FILTER (WHERE sync_status = 'synced')::float / COUNT(*) * 100, 1) as sync_success_rate
  FROM bookings
  
  UNION ALL
  
  SELECT 
    'contacts' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_records,
    COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_records,
    MAX(last_synced_at) as last_sync_time,
    ROUND(COUNT(*) FILTER (WHERE sync_status = 'synced')::float / COUNT(*) * 100, 1) as sync_success_rate
  FROM contacts
) sync_stats;
```

## 🚀 Deployment Steps Summary

1. **Deploy API**: `vercel --prod`
2. **Set Environment Variables**: Copy from `.env.example`
3. **Prepare Database**: Run sync preparation SQL
4. **Test Connection**: `curl /api/health/wix-integration`
5. **Run Initial Sync**: `curl -X POST /api/sync-all-wix-data`
6. **Validate Results**: Run integrity checks
7. **Setup Scheduled Sync**: Add cron jobs
8. **Monitor Performance**: Check webhook logs

Your sync system will now keep Wix and Supabase perfectly synchronized!
