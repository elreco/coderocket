# Supabase Notes

## Current status

This project was not historically maintained only through CLI-generated migrations.

As of 2026-05-01:

- `supabase/baseline.schema.sql` is now a schema-only export from the authoritative remote database,
- `types_db.ts` has been regenerated from that same remote database,
- `supabase/seed.sql` contains the deterministic storage bucket bootstrap required by the app,
- `supabase/current_state.sql` should be treated as historical reference only,
- `supabase/migrations/20260501000000_baseline_from_authoritative_schema.sql` is now the single baseline candidate used for fresh local installs,
- and the previous migration chain has been archived under `supabase/migrations-legacy/`.

During the export, two real drifts surfaced between code and production schema:

- `public.integration_schemas` does not exist in the authoritative database,
- `public.message_images` does not exist either, so image metadata should rely on `messages.prompt_images`.

The codebase has been adjusted to match that authoritative schema.

## Local development today

Use the new baseline candidate plus `supabase/seed.sql` for local resets:

```bash
npx supabase start
npx supabase db reset
npm run generate-types
```

Then verify the app against the schema by running the local stack and exercising the main flows.
At the moment, Docker was unavailable when this baseline was generated, so the candidate has not yet been revalidated end-to-end through an actual local `db reset`.

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

## Baseline status

The repo now uses a squashed baseline candidate generated from the authoritative production schema.

Because the remote dump includes Supabase-managed schemas such as `storage`, the migration was intentionally reduced to:

1. app-owned `public` tables, types, functions, indexes, constraints, triggers, and policies,
2. the app-specific `storage.objects` policies needed for `images`, `featured`, and `chat-images`,
3. and an explicit `auth.users -> public.handle_new_user()` trigger so local auth bootstrap keeps working.

The canonical reference snapshot remains:

```bash
supabase/baseline.schema.sql
```

The archived historical chain lives in:

```bash
supabase/migrations-legacy/
```

## Remaining validation step

What still remains is one final local verification pass with Docker + Supabase CLI:

```bash
npx supabase start
npx supabase db reset
npm run generate-types
npm run type-check
```

Once that passes against a fresh local stack, this candidate becomes the verified baseline going forward.
You do not need to keep the full legacy migration chain forever. For open source maintenance, a verified baseline migration plus future forward migrations is enough.

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
