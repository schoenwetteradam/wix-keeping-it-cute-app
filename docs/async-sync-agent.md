# Async Sync Agent Documentation

## Overview

The Async Sync Agent is a background service that synchronizes data between Wix and Supabase tables. It runs asynchronously without blocking API requests, making it ideal for syncing large datasets.

## Features

- **Asynchronous Processing**: Syncs run in the background without blocking API responses
- **Batch Processing**: Processes data in configurable batches for optimal performance
- **Multiple Sync Types**: Supports syncing customers, appointments, orders, or all tables
- **Error Handling**: Tracks errors per item and continues processing
- **Sync Logging**: Logs all sync operations for monitoring and debugging

## Architecture

### Components

1. **AsyncSyncAgent** (`lib/async-sync-agent.js`)
   - Main sync service class
   - Handles data fetching from Wix API
   - Transforms and upserts data to Supabase

2. **Trigger API** (`api/async-sync/trigger.js`)
   - Endpoint to start sync jobs
   - Returns immediately while sync runs in background
   - Creates sync log entries

3. **Status API** (`api/async-sync/status.js`)
   - Endpoint to check sync job status
   - Returns recent sync logs and statistics

4. **Sync Logs Table** (`migrations/20250120_create_sync_logs_table.sql`)
   - Database table for tracking sync operations
   - Stores status, results, and error information

## Usage

### Starting a Sync

#### Sync All Tables
```bash
POST /api/async-sync/trigger
Content-Type: application/json

{
  "table": "all"
}
```

#### Sync Specific Table
```bash
POST /api/async-sync/trigger
Content-Type: application/json

{
  "table": "customers"  // or "appointments", "orders"
}
```

#### Sync with Date Range (Appointments)
```bash
POST /api/async-sync/trigger
Content-Type: application/json

{
  "table": "appointments",
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-12-31T23:59:59Z"
  }
}
```

### Checking Sync Status

```bash
GET /api/async-sync/status

# With filters
GET /api/async-sync/status?limit=10&sync_type=customers&status=completed
```

## Database Schema

### Sync Logs Table

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  sync_type TEXT NOT NULL,        -- 'customers', 'appointments', 'orders', 'all'
  status TEXT NOT NULL,            -- 'running', 'completed', 'failed'
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  synced_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  results JSONB,                   -- Detailed sync results
  error TEXT,                      -- Error message if failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Configuration

The AsyncSyncAgent can be configured with the following options:

```javascript
const syncAgent = new AsyncSyncAgent({
  batchSize: 50,      // Number of records per batch
  maxRetries: 3,      // Maximum retry attempts
  retryDelay: 1000    // Delay between retries (ms)
});
```

## Environment Variables

Required environment variables for Wix API access:

- `WIX_SITE_ID` - Your Wix site ID
- `WIX_APP_ID` or `WIX_CLIENT_ID` - Wix app/client ID
- `WIX_APP_SECRET` or `WIX_CLIENT_SECRET` - Wix app secret
- `WIX_APP_INSTANCE_ID` or `WIX_INSTANCE_ID` - Wix app instance ID

Alternatively:
- `WIX_API_TOKEN` - Direct API token (if using API token authentication)

## Sync Process

### Customers Sync

1. Fetches contacts from Wix Contacts API
2. Transforms contact data to match Supabase schema
3. Upserts to `customers` table using `wix_contact_id` as conflict key
4. Continues until all contacts are synced

### Appointments Sync

1. Fetches bookings from Wix Bookings API
2. Links bookings to customers via `wix_contact_id`
3. Creates/updates customer records if missing
4. Upserts to `appointments` table using `wix_booking_id` as conflict key
5. Optionally filters by date range

### Orders Sync

1. Fetches orders from Wix Stores/Ecom API
2. Links orders to customers via email
3. Upserts to `orders` table using `wix_order_id` as conflict key
4. Stores order items as JSONB

### Full Sync

Runs all sync operations in sequence:
1. Syncs customers first (for referential integrity)
2. Syncs appointments (depends on customers)
3. Syncs orders (depends on customers)

## Error Handling

- Individual record errors are logged but don't stop the sync
- Sync continues processing remaining records
- Final results include error count and details
- Failed syncs are marked in sync_logs table

## Monitoring

Check sync status via:
- API endpoint: `GET /api/async-sync/status`
- Database query: `SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10`
- Logs include detailed results JSONB with per-table statistics

## Limitations

1. **Serverless Timeouts**: In serverless environments (Vercel), syncs are limited by function timeout (10s-60s for Hobby plan)
2. **Memory Limits**: Large datasets may require multiple sync runs
3. **Rate Limiting**: Wix API rate limits apply - syncs may be throttled

## Future Enhancements

- Queue system integration (e.g., Bull, BullMQ) for true async processing
- Vercel Cron Jobs for scheduled syncs
- Incremental syncs (only sync changed records)
- Webhook-triggered syncs for real-time updates
- Parallel processing for independent tables




