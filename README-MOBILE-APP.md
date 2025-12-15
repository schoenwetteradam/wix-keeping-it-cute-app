# Keeping It Cute Salon - Mobile App (PWA)

A Progressive Web App (PWA) for managing salon operations on mobile devices. This app syncs with your Wix site and provides real-time access to appointments, inventory, orders, and customers.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WIX_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run: `migrations/20250120_create_mobile_app_tables.sql`

### 4. Create PWA Icons

Place these files in the `public` directory:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

You can use [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) to create these.

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

## 📱 Features

### Schedule View
- View today's appointments
- Real-time updates when appointments change
- Customer contact information
- Service and staff details

### Inventory Management
- View all inventory items
- Low stock alerts
- Perform inventory audits
- Track audit history

### Orders
- View recent orders
- Customer information
- Order status and totals

### Customers
- Browse customer database
- Contact information
- Customer notes

## 🔧 Architecture

### Tech Stack
- **Next.js 14** - React framework with App Router
- **Supabase** - Database and real-time subscriptions
- **Tailwind CSS** - Styling
- **PWA** - Progressive Web App capabilities

### Data Flow

```
Wix Site → Webhooks → API Route → Supabase Database → Mobile App (Real-time)
```

1. Wix events trigger webhooks
2. Webhooks hit `/api/wix-webhook` endpoint
3. Data is synced to Supabase
4. Mobile app receives real-time updates via Supabase subscriptions

## 📁 Project Structure

```
app/
  ├── layout.tsx          # Root layout with PWA metadata
  ├── page.tsx            # Main mobile app page
  ├── components/         # Mobile app components
  │   ├── ScheduleView.tsx
  │   ├── InventoryView.tsx
  │   ├── OrdersView.tsx
  │   └── CustomersView.tsx
  └── api/
      └── wix-webhook/
          └── route.ts    # Webhook handler

migrations/
  └── 20250120_create_mobile_app_tables.sql

public/
  └── manifest.json       # PWA manifest
```

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Webhook signature verification
- Service role key only used server-side
- Environment variables never committed

## 📦 Deployment

### Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Don't forget to add environment variables in Vercel dashboard!

## 🐛 Troubleshooting

### PWA not installing
- Ensure HTTPS is enabled (required for PWA)
- Check `manifest.json` is accessible
- Verify service worker is registered

### Real-time not working
- Check Supabase Realtime is enabled
- Verify database replication is enabled
- Check browser console for errors

### Webhooks not syncing
- Verify webhook URL is accessible
- Check webhook secret matches
- Review server logs

## 📚 Documentation

See `docs/mobile-app-setup.md` for detailed setup instructions.

## 💰 Cost

This setup uses free tiers:
- **Supabase**: 500MB database, 50K MAU, 2GB bandwidth
- **Vercel**: 100GB bandwidth, serverless functions
- **Total**: $0/month for small-medium salons!

## 🆘 Support

For issues or questions, check:
1. Environment variables are set correctly
2. Database migration has been run
3. Webhooks are configured in Wix
4. Supabase project is active

---

Built with ❤️ for Keeping It Cute Salon

