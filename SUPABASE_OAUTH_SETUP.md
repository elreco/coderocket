# 🔐 Supabase OAuth Setup

## ✨ What's New

Your application now supports **TWO ways** to connect Supabase projects:

1. **OAuth (Recommended)** - One-click connection, auto-retrieves credentials
2. **Manual Configuration** - Copy/paste credentials manually

This is the same dual-option system as Figma!

---

## 🚀 Quick Setup

### Option 1: OAuth Configuration (Recommended)

#### Step 1: Create OAuth Application in Supabase

1. Go to https://supabase.com/dashboard/account/tokens
2. Click **"Create new OAuth application"**
3. Fill in:
   ```
   Name: CodeRocket (or your app name)
   Description: AI-powered component generator
   Homepage URL: https://yourapp.com (or http://localhost:3000 for dev)
   Redirect URL: https://yourapp.com/api/integrations/supabase/callback
                 (or http://localhost:3000/api/integrations/supabase/callback for dev)
   ```
4. Click **"Create"**
5. Copy the **Client ID** and **Client Secret**

#### Step 2: Add Environment Variables

Add to your `.env.local`:

```bash
# Supabase OAuth (optional - for one-click connection)
SUPABASE_OAUTH_CLIENT_ID=your_client_id_here
SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here

# App URL (required for OAuth callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

#### Step 3: Restart Your App

```bash
npm run dev
```

---

## 📖 How Users Will Use It

### Method 1: OAuth (If configured)

```
1. User goes to /account/integrations
2. Clicks "Add Integration" → "Supabase"
3. Clicks "Connect with Supabase" (green button)
4. Logs into Supabase (if not already logged in)
5. Authorizes the app
6. ✅ Project credentials are automatically retrieved and saved!
```

**What gets auto-configured:**
- ✅ Project URL
- ✅ Anon Key
- ✅ Access Token
- ✅ Project ID
- ✅ Integration name

### Method 2: Manual (Always works)

```
1. User goes to /account/integrations
2. Clicks "Add Integration" → "Supabase"
3. Scrolls to "Or configure manually"
4. Enters:
   - Integration name
   - Project URL (from Supabase dashboard)
   - Anon Key (from Supabase dashboard)
   - (Optional) Access Token
   - (Optional) Project ID
5. Clicks "Test Connection"
6. Clicks "Create Integration"
```

---

## 🎯 What Gets Retrieved via OAuth

When a user connects via OAuth, the system automatically:

1. **Authenticates** with Supabase Management API
2. **Fetches** user's projects
3. **Selects** first project (or user can choose later)
4. **Retrieves** API keys for that project
5. **Saves** everything securely encrypted

---

## 🔒 Security

- ✅ Client Secret stays server-side (never exposed to browser)
- ✅ All tokens are encrypted with AES-256-GCM
- ✅ Row-level security ensures users only see their own integrations
- ✅ OAuth follows industry best practices (same as GitHub, Google, etc.)

---

## 🆚 OAuth vs Manual Comparison

| Feature | OAuth | Manual |
|---------|-------|--------|
| **Ease of Use** | ⭐⭐⭐⭐⭐ One click | ⭐⭐⭐ Copy/paste |
| **Setup Time** | < 10 seconds | ~1 minute |
| **Error Prone** | ❌ No typos | ⚠️ Copy errors possible |
| **Requires Config** | ✅ Yes (env vars) | ❌ No |
| **Auto-updates** | ✅ Access token included | ⚠️ Manual token entry |
| **Multiple Projects** | ✅ Easy to switch | ⚠️ Manual each time |

---

## 📁 Files Created

```
app/api/integrations/supabase/
├── oauth/route.ts          # OAuth flow initiation
└── callback/route.ts       # OAuth callback handler

app/(default)/account/integrations/
└── supabase-config-dialog.tsx  # Updated with OAuth option
```

---

## 🧪 Testing

### Test OAuth Flow

1. Add env variables (see Step 2 above)
2. Restart app: `npm run dev`
3. Go to `/account/integrations`
4. Click "Add Integration" → "Supabase"
5. Click "Connect with Supabase"
6. Should redirect to Supabase login
7. Authorize the app
8. Should redirect back with success message

### Test Manual Flow

1. Go to `/account/integrations`
2. Click "Add Integration" → "Supabase"
3. Scroll to "Or configure manually"
4. Enter credentials
5. Click "Test Connection" → Should show success
6. Click "Create Integration"

---

## ❓ Troubleshooting

### "Supabase OAuth not configured"

→ Add `SUPABASE_OAUTH_CLIENT_ID` and `SUPABASE_OAUTH_CLIENT_SECRET` to `.env.local`
→ Restart the app

### "Failed to exchange code for token"

→ Check that redirect URI matches exactly in Supabase OAuth app settings
→ Verify Client ID and Secret are correct

### "No projects found"

→ User must have at least one Supabase project created
→ Ask user to create a project at https://supabase.com/dashboard

### OAuth button doesn't appear

→ OAuth button appears even without config (shows error if not configured)
→ User can always use manual configuration

---

## 🎨 UI Comparison

### Before (Manual Only)
```
┌─────────────────────────────────────┐
│ Add Supabase Integration            │
│                                     │
│ Integration Name *                  │
│ [____________]                      │
│                                     │
│ Project URL *                       │
│ [____________]                      │
│                                     │
│ Anon Key *                          │
│ [____________]                      │
│                                     │
│ [Test Connection] [Create]          │
└─────────────────────────────────────┘
```

### After (OAuth + Manual)
```
┌─────────────────────────────────────┐
│ Add Supabase Integration            │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔒 Option 1: OAuth (Recommended)│ │
│ │ [Connect with Supabase]         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ───── Or configure manually ─────  │
│                                     │
│ Integration Name *                  │
│ [____________]                      │
│                                     │
│ Project URL *                       │
│ [____________] [Open Dashboard →]   │
│                                     │
│ Anon Key *                          │
│ [____________]                      │
│                                     │
│ [Test Connection] [Create]          │
└─────────────────────────────────────┘
```

---

## 🌟 Benefits for Users

1. **Faster Setup** - One click vs manual copy/paste
2. **No Typos** - API credentials retrieved automatically
3. **Auto-updates** - Access token included for management API
4. **Better UX** - Same as GitHub, Google OAuth flows
5. **Still Works Without Config** - Manual option always available

---

## 🚀 Production Deployment

### Environment Variables

Add to your production environment (Vercel, etc.):

```bash
SUPABASE_OAUTH_CLIENT_ID=your_production_client_id
SUPABASE_OAUTH_CLIENT_SECRET=your_production_client_secret
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### Update OAuth App Settings

In Supabase OAuth app settings, add production redirect URI:
```
https://yourapp.com/api/integrations/supabase/callback
```

You can have both dev and production URIs!

---

## 📊 Comparison with Figma Integration

Both integrations now have the same UX:

| Feature | Figma | Supabase |
|---------|-------|----------|
| **OAuth** | ✅ Yes | ✅ Yes |
| **Manual** | ✅ Yes | ✅ Yes |
| **Auto-credentials** | ✅ Access token | ✅ Full project config |
| **One-click** | ✅ Yes | ✅ Yes |
| **Test connection** | ✅ Yes | ✅ Yes |

---

## ✅ You're Done!

Your app now has **professional-grade OAuth** for both:
- 🎨 **Figma** - Design imports
- 🗄️ **Supabase** - Backend integration

Users can choose their preferred connection method for each! 🚀

---

**Questions?** Check the main documentation or contact support.

