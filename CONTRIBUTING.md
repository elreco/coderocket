# Contributing

## Setup

```bash
npm install
npm --prefix builder install
cp .env.example .env
cp builder/.env.example builder/.env
npx supabase start
npx supabase db reset
npm run generate-types
npm run dev:all
```

## Before opening a PR

- run `npm run type-check`
- verify the app still starts with `BILLING_PROVIDER=none` and `DOMAIN_PROVIDER=none`
- if you changed the builder, verify `npm run builder:dev`
- if you changed the database schema, regenerate `types_db.ts`

## Database changes

Do not maintain schema changes by copy-pasting SQL directly into production anymore.

From now on:

- make schema changes through the Supabase CLI,
- commit versioned migrations,
- document any required seed data,
- and keep `types_db.ts` in sync.

See [supabase/README.md](/Users/alecorre/Documents/REPOS/tailwindai/coderocket/tailwind-ai/supabase/README.md).

## Scope

Cloud-specific adapters are welcome, but self-hosted mode must remain functional without:

- Stripe
- Vercel Domains
- Vercel Blob
