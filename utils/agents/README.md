# Website Scraping Agents

## Current Implementation

This directory contains the remote website scraping implementation that powers the **Clone website** feature. The actual scraping now runs inside the Fly.io `tailwind-ai-builder` service (Puppeteer + Stealth), and the Next.js app simply calls the `/scrape-simple` endpoint.

### Files

- `website-scraper-simple.ts` - client helper that forwards requests to the builder API
- `website-scraper-advanced.ts` - **Legacy scraper** (deprecated, kept for reference)

## Why Simple Scraper?

The simple scraper is inspired by same.new's approach and provides:

1. **Runs remotely** - Puppeteer + Stealth executed on Fly.io builder
2. **Efficient** - Extracts only what's needed, reducing token usage
3. **AI-first** - Trusts Claude's vision capabilities to analyze screenshots
4. **Clean output** - Simple markdown + screenshot + images
5. **Vercel friendly** - Next.js simply calls the remote endpoint

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

There is no longer a Firecrawl fallback. If the remote scraper cannot bypass a site's protection, the clone request fails with an explicit error so you can surface the message to the user.

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

Set one of the following environment variables so the Next.js app knows how to reach the builder service:

- `WEBSITE_SCRAPER_URL`
- `BUILDER_SCRAPER_URL`
- `BUILDER_URL`

If none are provided, it defaults to the `builderApiUrl` constant defined in `utils/config.ts`.

