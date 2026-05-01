# Supabase Notes

## Current status

This project was not historically maintained only through CLI-generated migrations.

That means:

- `supabase/migrations/` exists, but should be treated carefully,
- `supabase/current_state.sql` is a reference snapshot, not a guaranteed source of truth,
- and the long-term open source baseline still needs to be exported from the authoritative remote database.

## Local development today

Use the current migrations for local resets until you have produced a verified baseline export:

```bash
npx supabase start
npx supabase db reset
npm run generate-types
```

Then verify the app against the schema by running the local stack and exercising the main flows.

## Recommended baseline export flow

When you have access to the authoritative remote database:

1. Dump the real schema.

```bash
supabase db dump \
  --db-url "$SUPABASE_DB_URL" \
  --schema public,storage,graphql_public \
  --file supabase/baseline.schema.sql
```

2. Review and sanitize the dump.

- remove any data that should not be committed
- verify extensions and auth/storage dependencies
- confirm tables used by the app exist as expected

3. Create a new baseline migration from that schema.

```bash
supabase migration new baseline_open_source
```

4. Paste the sanitized schema into that new migration, then test:

```bash
npx supabase db reset
npm run generate-types
npm run type-check
```

5. Only after the baseline is verified should you archive or squash the legacy migration history.

You are not required to keep the full legacy migration chain forever.
For open source maintenance, a verified baseline migration plus future forward migrations is enough.

## Seed data

Keep `supabase/seed.sql` minimal.

- include only boot data needed by fresh installs
- never commit production user data
- prefer deterministic demo/reference records

## Maintenance rule

From now on, schema changes should go through:

- Supabase CLI migrations
- committed SQL files
- regenerated `types_db.ts`
