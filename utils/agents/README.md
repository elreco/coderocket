# Website Scraping Agents

## Current Implementation

This directory contains two website scraping implementations:

### Files

- `website-scraper-simple.ts` - **Primary scraper** using Puppeteer (FREE) - Simple & efficient
- `website-scraper-firecrawl.ts` - **Fallback scraper** using Firecrawl API
- `website-scraper-advanced.ts` - **Legacy scraper** (deprecated, kept for reference)

## Why Simple Scraper?

The simple scraper is inspired by same.new's approach and provides:

1. **100% FREE** - No API costs, runs on your own infrastructure
2. **Efficient** - Extracts only what's needed, reducing token usage
3. **AI-first** - Trusts Claude's vision capabilities to analyze screenshots
4. **Clean output** - Simple markdown + screenshot + images
5. **Vercel compatible** - Uses `@sparticuz/chromium` for serverless deployment

### What it extracts:

- **High-quality screenshot** (full page) - Primary visual reference
- **Clean markdown** - Text content from the page (headings, paragraphs, links)
- **Image URLs** - Logos and key images with their exact URLs
- **Metadata** - Title and description

### Philosophy

Instead of extracting every CSS detail, color, and font programmatically (which is fragile and token-heavy), we:
- Provide a high-quality screenshot for the AI to analyze visually
- Give clean content (markdown) for text and structure
- Include image URLs for assets
- Let Claude's vision capabilities do the heavy lifting

This approach is simpler, more robust, and produces better results.

## Fallback Strategy

If the simple scraper fails (network issues, bot protection, etc.), the system automatically falls back to Firecrawl if the API key is configured.

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

### For Simple Scraper (Primary)

No configuration needed! It works out of the box.

### For Firecrawl Fallback (Optional)

Set your Firecrawl API key in `.env.local` for fallback support:

```bash
FIRECRAWL_API_KEY=fc-your-api-key
```

Get your API key at [firecrawl.dev](https://www.firecrawl.dev/)

## Vercel Deployment

The simple scraper is optimized for Vercel:

- Uses `@sparticuz/chromium` for serverless Chromium
- Automatically detects environment (dev vs production)
- Falls back to Firecrawl if Puppeteer fails in production
- Lightweight and fast, reducing cold start times

