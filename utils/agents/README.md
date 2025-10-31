# Website Scraping Agents

## Current Implementation

This directory contains two website scraping implementations:

### Files

- `website-scraper-advanced.ts` - **Primary scraper** using Puppeteer (FREE)
- `website-scraper-firecrawl.ts` - **Fallback scraper** using Firecrawl API

## Why Advanced Scraper?

The advanced scraper is now the default method because it provides:

1. **100% FREE** - No API costs, runs on your own infrastructure
2. **Higher fidelity** - Direct access to HTML, CSS, and computed styles
3. **Better analysis** - Extracts real colors, fonts, layout structure from source
4. **Full control** - Customizable scraping behavior and timeout
5. **Vercel compatible** - Uses `@sparticuz/chromium` for serverless deployment

### What it extracts:

- Full-page high-quality screenshot
- Complete HTML source
- Markdown conversion of content
- **Real colors** from styles and classes
- **Real fonts** from CSS and Google Fonts links
- **Layout structure** (hero, navbar, footer, sidebar detection)
- Meta tags and descriptions
- All links from the page

## Fallback Strategy

If the advanced scraper fails (network issues, bot protection, etc.), the system automatically falls back to Firecrawl if the API key is configured.

## Usage

```typescript
import { cloneWebsite } from "@/utils/actions/clone-website";

const result = await cloneWebsite("https://example.com");

if (result.success) {
  console.log(`Scraped using: ${result.method}`);
  console.log(result.data);
}
```

## Configuration

### For Advanced Scraper (Primary)

No configuration needed! It works out of the box.

### For Firecrawl Fallback (Optional)

Set your Firecrawl API key in `.env.local` for fallback support:

```bash
FIRECRAWL_API_KEY=fc-your-api-key
```

Get your API key at [firecrawl.dev](https://www.firecrawl.dev/)

## Vercel Deployment

The advanced scraper is optimized for Vercel:

- Uses `@sparticuz/chromium` for serverless Chromium
- Automatically detects environment (dev vs production)
- Falls back to Firecrawl if Puppeteer fails in production

