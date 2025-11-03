# Figma Integration - Quick Start Guide

## 🎨 Overview

CodeRocket now supports importing Figma designs directly into your projects, similar to v0.dev and Lovable.ai. Convert your Figma designs to production-ready code in seconds!

## ✨ Features

- ✅ Direct Figma file import via URL
- ✅ OAuth authentication support
- ✅ Personal access token option
- ✅ Automatic code conversion (HTML, React, Vue, Svelte, Angular)
- ✅ Real-time design preview
- ✅ Multi-framework support

## 🚀 Quick Setup

### Step 1: Run Database Migration

Execute the new migration to add Figma support:

```bash
# In Supabase SQL Editor or locally
supabase migration up
```

Or run this SQL directly:

```sql
ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_integration_type_check;

ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_integration_type_check
  CHECK (integration_type IN ('supabase', 'stripe', 'blob', 'resend', 'auth', 'figma'));
```

### Step 2: Add Environment Variables (Optional - for OAuth)

Add to your `.env.local`:

```bash
# Figma OAuth (optional - can use personal token instead)
FIGMA_CLIENT_ID=your_figma_client_id
FIGMA_CLIENT_SECRET=your_figma_client_secret

# App URL for OAuth callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

To get Figma OAuth credentials:
1. Go to https://www.figma.com/developers/apps
2. Create a new app
3. Copy Client ID and Client Secret

### Step 3: Connect Your Figma Account

**Option A: OAuth (Recommended)**
1. Go to `/account/integrations`
2. Click "Add Integration" → Select "Figma"
3. Click "Connect with Figma"
4. Authorize the app

**Option B: Personal Access Token**
1. Generate token at: https://www.figma.com/developers/api#access-tokens
2. Go to `/account/integrations`
3. Click "Add Integration" → Select "Figma"
4. Paste your token and click "Test Connection"
5. Save

## 📖 How to Use

### Importing a Figma Design

1. **Open any component in CodeRocket**
2. **Click the "Figma" button** (next to the file upload button)
3. **Select your Figma integration**
4. **Paste Figma file URL**:
   ```
   https://www.figma.com/file/ABC123.../Design-Name
   ```
5. **Click "Import Design"**

The design will be converted to code and added to your prompt automatically!

### What Gets Converted

✅ Layout structure (frames, groups)
✅ Colors and backgrounds
✅ Typography (fonts, sizes, weights)
✅ Spacing and dimensions
✅ Text content
⚠️ Images (coming soon)
⚠️ Animations (not supported)

## 🛠️ Technical Details

### New Files Created

```
app/api/integrations/figma/
├── oauth/route.ts           # OAuth flow initiation
├── callback/route.ts        # OAuth callback handler
├── files/route.ts           # Fetch Figma files
└── convert/route.ts         # Convert design to code

app/(default)/account/integrations/
└── figma-config-dialog.tsx  # Configuration UI

components/
└── figma-import-button.tsx  # Import button component

utils/integrations/
├── types.ts                 # Added FigmaIntegrationConfig
└── validators.ts            # Added Figma validation

supabase/migrations/
└── 20250202000000_add_figma_integration_type.sql

docs/integrations/
└── figma.mdx                # Full documentation
```

### API Endpoints

**Convert Figma to Code**
```typescript
POST /api/integrations/figma/convert
{
  integrationId: string,
  fileKey: string,
  framework: 'html' | 'react' | 'vue' | 'svelte' | 'angular'
}
```

**Fetch Figma File**
```typescript
GET /api/integrations/figma/files?integration_id={id}&file_key={key}
```

## 🎯 Best Practices

### For Better Conversions

1. **Use Figma Auto Layout** - Converts better to Flexbox/Grid
2. **Name your layers** - Helps with semantic HTML
3. **Group related elements** - Creates cleaner component structure
4. **Use consistent spacing** - Better padding/margin conversion
5. **Define text styles** - Consistent typography

### After Import

1. **Review the code** - Always check generated code
2. **Add responsiveness** - Add media queries as needed
3. **Optimize images** - Add proper image loading
4. **Add accessibility** - Include ARIA labels
5. **Extract components** - Create reusable components

## 🐛 Troubleshooting

### "No Figma integration found"
→ Connect your Figma account in `/account/integrations`

### "Invalid Access Token"
→ Regenerate token in Figma settings

### "Failed to fetch Figma file"
→ Check file URL and access permissions

### "Conversion failed"
→ Try with a simpler design first
→ Check browser console for errors

## 📚 Full Documentation

See `/docs/integrations/figma.mdx` for complete documentation.

## 🎉 Example Usage

```typescript
// 1. User clicks "Figma" button
// 2. Pastes URL: https://www.figma.com/file/ABC123.../Landing-Page
// 3. Clicks "Import Design"
// 4. Gets this in the prompt:

Imported Figma design:
<div className="landing-page">
  <header className="hero">
    <h1>Welcome to Our Product</h1>
    <p>Build amazing things</p>
    <button className="cta-button">Get Started</button>
  </header>
  <!-- ... more content -->
</div>
```

## 🚧 Roadmap

- [ ] Image export and optimization
- [ ] Design token import
- [ ] Component library sync
- [ ] Real-time design updates
- [ ] Advanced layout support
- [ ] Animation conversion

## 💡 Tips

- Start with simple designs to test
- Use Figma components for better structure
- Review and refine generated code
- Combine with AI prompts for better results
- Use the import as a starting point, not final code

---

**Need Help?** Check the [FAQ](/faq) or contact support.

**Found a bug?** Report it on GitHub or contact the team.

Enjoy designing with Figma and coding with CodeRocket! 🚀

