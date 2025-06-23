# Keeping It Cute Salon - Wix Webhook System

A comprehensive webhook system for Keeping It Cute Salon that captures all business data from Wix into a structured Supabase database for analytics and customer management.

## 🎯 What This System Does

- **📅 Booking Management**: Captures appointment bookings, updates, and cancellations
- **👥 Customer Management**: Tracks customer contacts and profile updates
- **💰 Financial Tracking**: Processes orders, invoices, and payments
- **📊 Analytics**: Monitors website sessions and visitor behavior
- **🔍 Comprehensive Logging**: Universal webhook router for all event types

## 🛠️ Tech Stack

- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Integration**: Wix Webhooks
- **Language**: JavaScript (ES6 modules)

## 📋 Database Tables

| Table | Purpose | Key Data |
|-------|---------|----------|
| `bookings` | Appointment management | Customer details, services, scheduling |
| `contacts` | Customer profiles | Contact info, preferences, demographics |
| `orders` | E-commerce transactions | Purchase data, payment status, items |
| `sessions` | Website analytics | Visitor behavior, engagement metrics |
| `webhook_logs` | System monitoring | All webhook events and debugging |

## 🔗 API Endpoints

### Booking Webhooks
- `POST /api/booking-created` - New appointments
- `POST /api/booking-updated` - Appointment changes
- `POST /api/booking-canceled` - Cancellations

### Customer Webhooks
- `POST /api/contact-created` - New customer registrations
- `POST /api/contact-updated` - Profile updates

### E-commerce Webhooks
- `POST /api/order-paid` - Purchase completions
- `POST /api/invoice-paid` - Invoice payments

### Analytics Webhooks
- `POST /api/session-ended` - Website visitor sessions
- `POST /api/webhook-router` - Universal fallback for any webhook

## 🚀 Quick Setup

### 1. Database Setup
Run this SQL in your Supabase dashboard:

```sql
-- Complete database schema available in setup documentation
-- Creates: bookings, contacts, orders (enhanced), sessions, webhook_logs tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- bookings table
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid,
  service text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  raw jsonb
);

-- contacts table
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text,
  phone text,
  metadata jsonb
);

-- orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text,
  total numeric,
  payment_status text,
  raw jsonb
);

-- sessions table
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id text,
  started_at timestamptz,
  ended_at timestamptz,
  raw jsonb
);

-- webhook_logs table
CREATE TABLE webhook_logs (
  id serial PRIMARY KEY,
  event_type text,
  payload jsonb,
  logged_at timestamptz DEFAULT now()
);

-- service_staff table
CREATE TABLE service_staff (
  service_id uuid REFERENCES salon_services(id),
  staff_id uuid REFERENCES staff(id),
  PRIMARY KEY (service_id, staff_id)
);

-- service_resources table
CREATE TABLE service_resources (
  service_id uuid REFERENCES salon_services(id),
  resource_name text,
  PRIMARY KEY (service_id, resource_name)
);

-- service_products table
CREATE TABLE service_products (
  service_id uuid REFERENCES salon_services(id),
  product_id uuid REFERENCES products(id),
  PRIMARY KEY (service_id, product_id)
);

## Environment Configuration

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL` for the browser)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CORS_ALLOW_ORIGIN` (optional)

These values are required to build and run the API routes. Variables prefixed
with `NEXT_PUBLIC_` are exposed to the browser, while server-side handlers rely
on `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Running locally

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/signup` to create your first user (or `/login` if an account already exists). Successful authentication redirects to `/staff`.

## 📷 Service Images

Place SVG images for services in `public/images/services`.
Each file should be named using the slugified service name
(for example, `Cut & Style` becomes `cut-and-style.svg`).
These images are used when a service does not specify its
own `image_url`.


## 🔧 Development Notes

### Environment variables

Create a `.env.local` file by copying `.env.example` and setting your
Supabase values. At a minimum set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` so the frontend can connect to your
Supabase project.

### Running migrations

Apply each SQL file in the `migrations` directory in order:

```bash
psql $SUPABASE_URL < migrations/20240102_add_profiles_table.sql
```

### Authentication flow

Use the `/login` and `/signup` pages to authenticate.
After login, requests include a `Bearer` token from the Supabase session in the `Authorization` header.
