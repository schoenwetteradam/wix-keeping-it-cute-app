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

