# Website Scraping Agents

## Current Implementation

This directory contains the website scraping implementation using **Firecrawl**.

### Files

- `website-scraper-firecrawl.ts` - Main scraper using Firecrawl API

## Why Firecrawl?

We use Firecrawl exclusively for website scraping because it provides:

1. **Better anti-bot protection bypass** - Handles Cloudflare, reCAPTCHA, etc.
2. **High-fidelity cloning** - Captures complete page structure and assets
3. **Built-in screenshots** - Full-page screenshots included
4. **LLM-ready output** - Markdown format optimized for AI processing
5. **No infrastructure management** - No need to manage Puppeteer/Chromium

## Configuration

The scraper is optimized for faithful website cloning:

```typescript
{
  formats: ["html", "markdown", "screenshot"],
  onlyMainContent: false,  // Capture entire page
  includeTags: [           // All important elements
    "img", "video", "style", "link", "script", "meta",
    "header", "nav", "main", "section", "footer", "aside", "article"
  ],
  waitFor: 3000,          // Wait for dynamic content
  timeout: 60000          // Generous timeout
}
```

## Usage

```typescript
import { scrapeWebsiteWithFirecrawl } from "@/utils/agents/website-scraper-firecrawl";

const websiteData = await scrapeWebsiteWithFirecrawl("https://example.com");
```

## Setup

Set your Firecrawl API key in `.env.local`:

```bash
FIRECRAWL_API_KEY=fc-your-api-key
```

Get your API key at [firecrawl.dev](https://www.firecrawl.dev/)

