# Mobile App Setup Guide

This guide will help you set up the Keeping It Cute Salon mobile app (PWA).

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Wix site with API access
- Vercel account (for deployment)

## Step 1: Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file: `migrations/20250120_create_mobile_app_tables.sql`
4. Verify tables are created:
   - `customers`
   - `appointments`
   - `inventory`
   - `inventory_audits`
   - `orders`

## Step 2: Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Wix Webhook Configuration
WIX_WEBHOOK_SECRET=your-wix-webhook-secret

# Node Environment
NODE_ENV=development
```

### Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Getting Wix Webhook Secret

1. Go to your Wix dashboard
2. Navigate to Settings > Webhooks
3. Create a webhook pointing to: `https://your-domain.com/api/wix-webhook`
4. Copy the webhook secret → `WIX_WEBHOOK_SECRET`

## Step 3: PWA Icons

Create PWA icons and place them in the `public` directory:

- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

You can use online tools like [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) to create these icons.

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Step 6: Test PWA Installation

1. Open the app in Chrome/Edge on mobile or desktop
2. Look for the "Install" or "Add to Home Screen" prompt
3. On mobile: Use browser menu → "Add to Home Screen"
4. On desktop: Click the install icon in the address bar

## Step 7: Configure Wix Webhooks

Set up webhooks in your Wix dashboard to sync data:

1. Go to Wix Dashboard > Settings > Webhooks
2. Add webhooks for:
   - `bookings.appointment_created`
   - `bookings.appointment_updated`
   - `contacts.contact_created`
   - `contacts.contact_updated`
   - `stores.order_created`
   - `stores.order_updated`
3. Set webhook URL to: `https://your-domain.com/api/wix-webhook`

## Step 8: Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Add environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.local`

## Features

### Schedule View
- View today's appointments
- See customer details, service, staff, and time
- Real-time updates via Supabase subscriptions

### Inventory View
- View all inventory items
- Low stock alerts
- Perform inventory audits
- Track audit history

### Orders View
- View recent orders
- Customer information
- Order status and totals

### Customers View
- Browse customer list
- Contact information
- Customer notes

## Troubleshooting

### PWA not installing
- Ensure HTTPS is enabled (required for PWA)
- Check that `manifest.json` is accessible
- Verify service worker is registered (check browser DevTools > Application > Service Workers)

### Webhooks not working
- Verify webhook URL is accessible
- Check webhook secret matches
- Review server logs for errors
- Test webhook endpoint: `GET /api/wix-webhook` should return status

### Supabase connection issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure Row Level Security policies allow your operations
- Review Supabase logs for errors

### Real-time not working
- Verify Supabase Realtime is enabled in project settings
- Check database replication is enabled for tables
- Ensure you're using the correct Supabase client

## Security Notes

- Never commit `.env.local` to version control
- Use service role key only in server-side code
- Enable Row Level Security in Supabase
- Regularly rotate webhook secrets
- Use HTTPS in production

## Cost Optimization

This setup uses:
- **Supabase Free Tier**: 500MB database, 50K MAU, 2GB bandwidth
- **Vercel Free Tier**: 100GB bandwidth, serverless functions
- **Wix**: Your existing subscription

Total cost: **$0/month** for small-medium salons!

