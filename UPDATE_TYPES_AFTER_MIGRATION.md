# Update Types After Migration

## Important: TypeScript Errors

You will see TypeScript errors for the `token_usage_tracking` table and the new `cost_usd` and `model_used` fields in the `messages` table. This is normal and expected.

## Steps to Fix

### 1. Apply the Database Migration

First, apply the new migration to your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or apply the migration file manually:
# supabase/migrations/20250205000000_add_token_based_pricing.sql
```

### 2. Regenerate TypeScript Types

After applying the migration, regenerate your TypeScript types from Supabase:

```bash
# Generate types from your Supabase project
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types_db.ts

# Or if using local development
npx supabase gen types typescript --local > types_db.ts
```

This will add:
- The new `token_usage_tracking` table to your types
- The `cost_usd: number | null` field to `messages` table
- The `model_used: string | null` field to `messages` table

### 3. Verify the Changes

After regenerating, you should see:

**In `messages` table:**
```typescript
messages: {
  Row: {
    // ... existing fields
    cost_usd: number | null;
    model_used: string | null;
  };
}
```

**New `token_usage_tracking` table:**
```typescript
token_usage_tracking: {
  Row: {
    id: string;
    user_id: string;
    chat_id: string;
    message_id: number | null;
    usage_type: string;
    model_used: string;
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    cost_usd: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id: string;
    message_id?: number | null;
    usage_type: string;
    model_used: string;
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    cost_usd?: number;
    created_at?: string;
  };
  Update: {
    // ... similar to Insert
  };
}
```

### 4. All TypeScript Errors Should Be Resolved

Once you've regenerated the types, all the TypeScript errors related to:
- `token_usage_tracking` table not existing
- `cost_usd` property not existing
- `model_used` property not existing

will be automatically resolved.

## Testing

After regenerating types, test the new functionality:

1. Create a new chat and send a message
2. Check that the cost is displayed below the AI response
3. Go to your account page and verify token usage is shown
4. Try the "Improve Prompt" feature and check that it's tracked

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Drop the new table
DROP TABLE IF EXISTS token_usage_tracking;

-- Remove the new columns from messages
ALTER TABLE messages DROP COLUMN IF EXISTS cost_usd;
ALTER TABLE messages DROP COLUMN IF EXISTS model_used;
```

Then regenerate types again.

