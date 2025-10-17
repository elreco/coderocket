# Ekinox Waitlist Setup Guide

## Overview
This guide explains how to set up the Ekinox waitlist feature with email notifications.

## Features
- ✅ Beautiful waitlist landing page with video demo
- ✅ Email collection form
- ✅ Automatic confirmation email to subscribers
- ✅ Admin notification email when someone joins
- ✅ Database storage of waitlist entries

## Setup Instructions

### 1. Database Migration

Run the migration to create the `ekinox_waitlist` table:

```bash
npx supabase db push
```

Or manually apply the migration file:
```
supabase/migrations/20250117000000_create_ekinox_waitlist.sql
```

### 2. Email Service Configuration (Optional but Recommended)

#### Option A: Using Resend (Recommended)

1. Go to [resend.com](https://resend.com) and create an account
2. Get your API key from the dashboard
3. Add your domain and verify it (or use their test domain for development)
4. Add the API key to your `.env.local`:

```bash
RESEND_API_KEY=re_your_api_key_here
```

#### Option B: Without Email Service

The system will work without Resend but will only log emails to the console. This is useful for development.

### 3. Video Demo

Place your demo video in the public folder:
```
public/TAILWIND-AI-RESOURCES/demo.mp4
```

Or update the video path in `/app/(default)/ekinox/page.tsx` line 144.

### 4. Verify Setup

1. Navigate to `/ekinox` on your site
2. Enter an email address
3. Check that:
   - Entry is created in `ekinox_waitlist` table
   - Confirmation email is sent to the subscriber
   - Admin notification is sent to `alexandrelecorre.pro@gmail.com`

## Database Schema

```sql
ekinox_waitlist
├── id (UUID, Primary Key)
├── email (VARCHAR, UNIQUE)
├── ip_address (VARCHAR)
├── user_agent (TEXT)
└── created_at (TIMESTAMP)
```

## API Endpoint

**POST** `/api/ekinox/waitlist`

Request body:
```json
{
  "email": "user@example.com"
}
```

Response (success):
```json
{
  "success": true,
  "message": "Successfully joined the waitlist!"
}
```

Response (error):
```json
{
  "error": "This email is already on the waitlist!"
}
```

## Email Templates

### User Confirmation Email
- Sent to: Subscriber
- Subject: "Welcome to the Ekinox Early Access List! 🚀"
- Content: Welcome message with benefits and features

### Admin Notification Email
- Sent to: alexandrelecorre.pro@gmail.com
- Subject: "🎯 New Ekinox Waitlist Signup!"
- Content: Subscriber details (email, IP, user agent, timestamp)

## Customization

### Change Admin Email

Edit the `ADMIN_EMAIL` constant in:
```
app/api/ekinox/waitlist/route.ts
```

### Modify Email Templates

Edit the HTML templates in:
```
app/api/ekinox/waitlist/route.ts
```

Look for the `sendEmail()` calls around lines 70 and 170.

### Change Page Content

Edit the landing page:
```
app/(default)/ekinox/page.tsx
```

## Viewing Waitlist Data

Query the waitlist in Supabase:

```sql
SELECT
  email,
  created_at,
  ip_address
FROM ekinox_waitlist
ORDER BY created_at DESC;
```

## Security Features

- ✅ Email validation
- ✅ Unique email constraint (no duplicates)
- ✅ IP address logging for spam prevention
- ✅ Row Level Security (RLS) policies
- ✅ Rate limiting through database constraints

## Troubleshooting

### Emails not sending

1. Check that `RESEND_API_KEY` is set in `.env.local`
2. Verify your Resend domain is verified
3. Check the console for error messages
4. Ensure you're using a valid "from" email address

### Database errors

1. Verify the migration was applied: `npx supabase db reset`
2. Check RLS policies are enabled
3. Ensure Supabase connection is working

### Duplicate email errors

This is expected behavior. The system prevents duplicate signups by design.

## Next Steps

When you're ready to launch Ekinox:

1. Export all emails from the database
2. Send launch notification with promo codes
3. Update the landing page to remove "Coming Soon"
4. Add links to the actual Ekinox application

## Support

For issues, contact: alexandrelecorre.pro@gmail.com

