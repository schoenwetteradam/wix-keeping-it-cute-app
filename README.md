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
| `loyalty` | Loyalty program | Points balance and activity |
| `orders` | E-commerce transactions | Purchase data, payment status, items |
| `wix_payments` | Wix Cashier payments | Order links, amounts, status, provider ID |
| `sessions` | Website analytics | Visitor behavior, engagement metrics |
| `webhook_logs` | System monitoring | All webhook events and debugging |
| `staff_chat_messages` | Internal staff chat | Message content and timestamps |
| `purchase_orders` | Supply ordering | Vendor info, totals, status |
| `purchase_order_items` | Items on a purchase order | Product ID, quantity, cost |

## 🔗 API Endpoints

### Booking Webhooks
- `POST /api/booking-created` - New appointments
- `POST /api/booking-updated` - Appointment changes
- `POST /api/booking-canceled` - Cancellations
- `POST /api/cancel-booking/[bookingId]` - Cancel a booking via Wix API
- `POST /api/reschedule-booking/[bookingId]` - Reschedule a booking via Wix API

### Customer Webhooks
- `POST /api/contact-created` - New customer registrations
- `POST /api/contact-updated` - Profile updates

### E-commerce Webhooks
- `POST /api/order-paid` - Purchase completions
- `POST /api/invoice-paid` - Invoice payments
- `POST /api/payment-approved` - Wix Cashier payment events

### Analytics Webhooks
- `POST /api/session-ended` - Website visitor sessions
- `POST /api/webhook-router` - Universal fallback for any webhook

### Salon Data
- `GET /api/get-branding` - Retrieve salon branding details
- `GET /api/get-orders` - List recent orders
- `GET /api/get-customers` - Fetch customer records
- `POST /api/create-booking` - Create a Wix appointment booking
- `POST /api/create-checkout` - Generate a Wix checkout session for payments
- `GET /api/staff-chat` - Retrieve recent staff chat messages
- `POST /api/staff-chat` - Post a new staff chat message
- `GET /api/purchase-orders` - Retrieve purchase orders
- `POST /api/purchase-orders` - Create a new purchase order
- `PUT /api/purchase-orders` - Update a purchase order
- `DELETE /api/purchase-orders` - Remove a purchase order
- `GET /api/purchase-order-items` - Retrieve items for a purchase order
- `POST /api/purchase-order-items` - Add an item to a purchase order
- `PUT /api/purchase-order-items` - Update a purchase order item
- `DELETE /api/purchase-order-items` - Delete a purchase order item

Example usage:

```bash
# Fetch the 10 most recent orders
curl '/api/get-orders?limit=10'

# Search for customers by name
curl '/api/get-customers?search=jane'

# Create a purchase order
curl -X POST -H 'Content-Type: application/json' \
  -d '{"vendor_id":"123","order_date":"2024-01-01"}' \
  /api/purchase-orders
```

### Dashboard Metrics

Create a function in Supabase that aggregates the numbers used on the business dashboard:

```sql
-- migrations/20240917_allow_null_staff_in_dashboard_metrics.sql
CREATE OR REPLACE FUNCTION dashboard_metrics(p_staff_id uuid)
RETURNS TABLE(
  upcoming_appointments integer,
  product_usage_needed integer,
  low_stock integer,
  orders_today integer
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      (SELECT COUNT(*) FROM bookings
         WHERE (p_staff_id IS NULL OR staff_id = p_staff_id)
           AND appointment_date >= NOW()
           AND appointment_date < NOW() + INTERVAL '7 days'),
      (SELECT COUNT(*) FROM product_usage_sessions
         WHERE (p_staff_id IS NULL OR staff_id = p_staff_id)
           AND is_completed = false),
      (SELECT COUNT(*) FROM products
         WHERE is_active = true
           AND current_stock <= min_threshold),
      (SELECT COUNT(*) FROM orders
         WHERE (p_staff_id IS NULL OR staff_id = p_staff_id)
           AND created_at::date = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql STABLE;
```

The frontend calls `/api/get-dashboard-metrics` which executes this function and returns the results. By default each staff member can view only their own metrics. User IDs listed in the `ADMIN_USER_IDS` variable are allowed to request metrics for any staff member or for the entire business.

### Booking & Payments

1. Call `/api/services` and `/api/query-availability` to display open slots.
2. Send the chosen slot and customer details to `/api/create-booking`.
3. Use the returned booking information to call `/api/create-checkout` and obtain a payment URL.
4. Redirect the customer to the checkout URL to complete payment on Wix.

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
  service_id uuid REFERENCES salon_services(id),
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
- `SUPABASE_STORAGE_BUCKET` (e.g., `salon-images`)
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (same as above for the browser)
- `SUPABASE_CLIENT_UPLOADS_BUCKET` bucket for before/after service photos
- `SUPABASE_RECEIPTS_BUCKET` bucket for product usage receipts
- `WIX_API_TOKEN` Wix API token used for booking operations
- `WIX_WEBHOOK_SECRET` secret used to verify Wix webhooks
- `ADMIN_USER_IDS` comma-separated Supabase user IDs allowed to view all staff metrics

Generate these values in the **Wix Developer Center** by creating (or selecting)
an app and navigating to **API Keys**. Create a new API key for server-to-server
calls and copy it into `WIX_API_TOKEN`. Add a webhook secret and place its value
in `WIX_WEBHOOK_SECRET`. Put both variables in `.env.local` during development or
set them as environment variables in your deployment platform. The webhook
secret is currently unused unless you implement request verification.

These values are required to build and run the API routes. Variables prefixed
with `NEXT_PUBLIC_` are exposed to the browser, while server-side handlers rely
on `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Running locally

Ensure you are using **Node.js 18**. A `.nvmrc` file is provided,
so you can run `nvm use` to automatically select the correct version.

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/signup` to create your first user (or `/login` if an account already exists). Successful authentication redirects to `/staff`.
Your staff portal uses Supabase-only login. Staff members visit `/login` and sign in with the email and password you created for them in the Supabase dashboard. After logging in they land on `/staff` and all API requests are authorized using their Supabase session.

## 📷 Service Images

Place SVG images for services in `public/images/services`.
Each file should be named using the slugified service name
(for example, `Cut & Style` becomes `cut-and-style.svg`).
These images are used when a service does not specify its
own `image_url`.

### Generating placeholder images

Run the local script to create placeholder assets in `public/images`:

```bash
node scripts/create-placeholder-images.mjs
```

The script is for development only and is not deployed as an API route.

### Client Uploads

Staff can attach before/after photos or other files to a booking. Files are
uploaded to the `client-uploads` bucket and linked to the booking record. Use
the `Upload Images` button on an appointment in the staff portal to manage
these files.


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

This project previously supported Wix OAuth, but the staff portal now relies
solely on Supabase authentication. Staff members sign in with the credentials
you create for them in Supabase. After logging in they are redirected to
`/staff`, and all requests include the Supabase session token in the
`Authorization` header.

When a staff member uses a Supabase invite or magic link, the URL includes
`#access_token=...`. The app now detects this fragment in `pages/_app.js`, calls
`supabase.auth.getSessionFromUrl()` to store the session, and then redirects to
`/staff` automatically.

### Error handling

Unexpected client errors are captured by a React error boundary defined in `pages/_app.js`. When an exception occurs, the boundary renders a simple message instead of leaving the page blank.


## 🖥️ Pages

After signing in you can open these screens directly:

- **/orders** – view recent orders and open a modal with full details.
- **/customers** – browse and search customer records.
- **/staff-chat** – access the internal chat room for staff members.

Navigate by entering the URL in your browser or by linking from the staff portal.
The staff portal now includes dedicated **Orders**, **Customers**, and **Chat** tabs for quick access. Staff can also open the chat directly at `/staff-chat`.

## Testing

Run `npm install` to install all dependencies, including Jest for running the unit tests.

```bash
npm install
npm test
```

The repository contains three tests across two files. When they all pass you should see output similar to:

```text
 PASS  tests/auth.test.js
 PASS  tests/supabaseClient.test.js

Test Suites: 2 passed, 2 total
Tests:       3 passed, 3 total
```
