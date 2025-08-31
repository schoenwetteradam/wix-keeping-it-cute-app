# Bidirectional Sync Deployment Guide

This guide summarizes the steps required to deploy the Wix ↔ Supabase bidirectional sync.

## Environment Variables
Add the following variables locally (`.env.local`) and on Vercel:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WIX_API_TOKEN=your-wix-api-token

# Sync configuration
WIX_SITE_ID=your-wix-site-id
WIX_ACCOUNT_ID=your-wix-account-id
WIX_WEBHOOK_SECRET=your-wix-webhook-secret
WEBHOOK_SECRET=your-supabase-webhook-auth-token

# Wix App IDs
WIX_BOOKINGS_APP_ID=13d21c63-b5ec-5912-8397-c3a5ddb27a97
WIX_STORES_APP_ID=215238eb-22a5-4c36-9e7b-e7c08025e04e
WIX_ECOMMERCE_APP_ID=1380b703-ce81-ff05-f115-39571d94dfcd
```

Generate a webhook secret with:

```bash
openssl rand -hex 32
```

## API Endpoints
The following serverless functions handle sync operations:

- `POST /api/sync/webhook-product-changed`
- `POST /api/sync/webhook-inventory-changed`
- `POST /api/sync/webhook-booking-changed`
- `POST /api/sync/webhook-product-usage`
- `POST /api/webhooks/wix-product-updated`
- `POST /api/webhooks/wix-inventory-updated`

Supabase webhooks should include an `Authorization: Bearer <WEBHOOK_SECRET>` header. Wix webhooks should include `x-wix-signature` matching `WIX_WEBHOOK_SECRET`.

## Database
Run the SQL in the deployment instructions to add sync tracking columns and product usage tables before enabling the webhooks.

## Deployment
After committing the changes:

```bash
vercel --prod
```

Verify deployment with:

```bash
curl https://your-app.vercel.app/api/health/wix-integration
```

This provides a concise reference for setting up bidirectional sync.
