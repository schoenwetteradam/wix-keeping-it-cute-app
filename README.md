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
