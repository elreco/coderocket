# Supabase Notes

## Current status

This project was not historically maintained only through CLI-generated migrations.

As of 2026-05-01:

- `supabase/baseline.schema.sql` is now a schema-only export from the authoritative remote database,
- `types_db.ts` has been regenerated from that same remote database,
- `supabase/seed.sql` contains the deterministic storage bucket bootstrap required by the app,
- `supabase/current_state.sql` should be treated as historical reference only,
- and `supabase/migrations/` should still be treated as legacy history until a fully squashed baseline migration is verified locally.

During the export, two real drifts surfaced between code and production schema:

- `public.integration_schemas` does not exist in the authoritative database,
- `public.message_images` does not exist either, so image metadata should rely on `messages.prompt_images`.

The codebase has been adjusted to match that authoritative schema.

## Local development today

Use the current migrations plus `supabase/seed.sql` for local resets until you have produced and validated a fully squashed baseline migration:

```bash
npx supabase start
npx supabase db reset
npm run generate-types
```

Then verify the app against the schema by running the local stack and exercising the main flows.

## What is already exported

The canonical remote schema snapshot now lives in:

```bash
supabase/baseline.schema.sql
```

It was produced with:

```bash
pg_dump --schema-only --no-owner --no-privileges
```

and contains structure only:

- schemas
- tables
- views
- functions
- indexes
- policies
- constraints

It does not contain application rows.

## Recommended squash flow

The remaining step is to convert the exported schema into a verified baseline migration that works with `supabase db reset`.

Because the remote dump includes Supabase-managed schemas such as `storage`, you should not blindly copy the entire dump into `supabase/migrations/`.

Instead:

1. Keep `supabase/baseline.schema.sql` as the canonical reference snapshot.

2. Build a squashed baseline migration from the app-owned objects you actually want to recreate in local development.

3. Preserve storage bucket bootstrap in `supabase/seed.sql`.

4. Validate the result locally with Docker + Supabase CLI:

```bash
npx supabase start
npx supabase db reset
npm run generate-types
npm run type-check
```

5. Only after that local reset is verified should you archive or squash the legacy migration history.

You are not required to keep the full legacy migration chain forever.
For open source maintenance, a verified baseline migration plus future forward migrations is enough.

## Seed data

Keep `supabase/seed.sql` minimal.

- include only boot data needed by fresh installs
- include deterministic config records such as storage buckets
- never commit production user data
- prefer deterministic demo/reference records

## Maintenance rule

From now on, schema changes should go through:

- Supabase CLI migrations
- committed SQL files
- regenerated `types_db.ts`
