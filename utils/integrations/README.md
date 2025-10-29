# CodeRocket Integrations System

This directory contains the integration system for CodeRocket, allowing users to connect external services (Supabase, Stripe, Vercel Blob, etc.) to their generated applications.

## 🚀 Setup

### 1. Run the Database Migration

Execute the SQL migration file to create the necessary tables:

```bash
# In your Supabase dashboard, go to SQL Editor and run:
# supabase/migrations/20250127000000_add_integrations_system.sql
```

This will create:
- `user_integrations` - Store user integration configurations
- `chat_integrations` - Link chats to specific integrations
- `integration_schemas` - Store generated schemas and backend files

### 2. Configure Encryption Key

For security, integration credentials (API keys, secrets) are encrypted before storage.

**IMPORTANT:** Add this to your `.env.local`:

```bash
# Generate a secure 32+ character key using:
# openssl rand -base64 32
INTEGRATION_ENCRYPTION_KEY=your-secure-random-key-here
```

**⚠️ WARNING:**
- Keep this key secret and secure
- If you lose this key, all integration configs become unrecoverable
- Use different keys for development and production
- Never commit this key to version control

### 3. Update TypeScript Types

If you modify the database schema, regenerate the TypeScript types:

```bash
npm run generate-types
```

## 📦 Files Structure

```
utils/integrations/
├── types.ts                    # TypeScript interfaces for all integrations
├── validators.ts               # Validation functions for integration configs
├── encryption.ts               # Encryption/decryption for sensitive data
├── integration-helpers.ts      # Helper functions for CRUD operations
├── index.ts                    # Public exports
└── README.md                   # This file
```

## 🔌 Supported Integrations

### 1. Supabase
- **Purpose:** Backend database and authentication
- **Config Required:**
  - Project URL
  - Anon Key
  - Service Role Key (optional)
  - Database Schema (optional)

### 2. Stripe
- **Purpose:** Payment processing
- **Config Required:**
  - Publishable Key
  - Secret Key (optional)
  - Webhook Secret (optional)
  - Mode (test/live)

### 3. Vercel Blob
- **Purpose:** File storage and CDN
- **Config Required:**
  - Blob Token
  - Store ID (optional)

### 4. Resend
- **Purpose:** Email delivery
- **Config Required:**
  - API Key
  - From Email

### 5. Auth (Coming Soon)
- **Purpose:** Authentication providers
- **Config Required:**
  - Provider type
  - Client ID/Secret

## 🔒 Security

### Encryption
All sensitive data (API keys, secrets) is encrypted using AES-256-GCM before storage:
- Salt: 64 bytes
- IV: 16 bytes
- Auth Tag: 16 bytes
- Key derivation: PBKDF2 with 100,000 iterations

### Row Level Security
All integration tables have RLS policies ensuring:
- Users can only access their own integrations
- Chat integrations are only accessible by chat owners
- No public access to integration configs

### Validation
Before saving, all integrations are validated:
- Format validation (URL structure, key format)
- Connection testing (optional)
- Permission verification

## 📖 Usage Examples

### Create a Supabase Integration

```typescript
import { createUserIntegration, IntegrationType } from '@/utils/integrations';

const result = await createUserIntegration(
  userId,
  IntegrationType.SUPABASE,
  'My Blog Database',
  {
    projectUrl: 'https://xxx.supabase.co',
    anonKey: 'eyJhbG...',
    databaseSchema: {
      tables: [
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'uuid', isPrimaryKey: true },
            { name: 'title', type: 'text' },
            { name: 'content', type: 'text' },
          ],
        },
      ],
    },
  }
);
```

### Enable Integration for a Chat

```typescript
import { enableChatIntegration } from '@/utils/integrations';

await enableChatIntegration(chatId, integrationId);
```

### Get Active Integrations for a Chat

```typescript
import { getChatIntegrations } from '@/utils/integrations';

const integrations = await getChatIntegrations(chatId);
// Returns array of enabled integrations with decrypted configs
```

### Validate Credentials

```typescript
import { validateSupabaseCredentials } from '@/utils/integrations';

const result = await validateSupabaseCredentials({
  projectUrl: 'https://xxx.supabase.co',
  anonKey: 'eyJhbG...',
});

if (result.valid) {
  console.log('✅ Valid credentials!');
} else {
  console.error('❌ Error:', result.error);
}
```

## 🔄 Adding a New Integration Type

1. **Add the type to the enum:**
```typescript
// types.ts
export enum IntegrationType {
  // ...
  NEW_SERVICE = "new_service",
}
```

2. **Create the config interface:**
```typescript
export interface NewServiceIntegrationConfig {
  apiKey: string;
  endpoint?: string;
  // ... other config
}
```

3. **Add validation:**
```typescript
// validators.ts
export async function validateNewServiceCredentials(
  config: NewServiceIntegrationConfig
): Promise<ValidationResult> {
  // Validation logic
}
```

4. **Update the union type:**
```typescript
export type IntegrationConfig =
  | SupabaseIntegrationConfig
  // ...
  | NewServiceIntegrationConfig;
```

5. **Update the migration:**
```sql
ALTER TABLE user_integrations
DROP CONSTRAINT user_integrations_integration_type_check;

ALTER TABLE user_integrations
ADD CONSTRAINT user_integrations_integration_type_check
CHECK (integration_type IN ('supabase', 'stripe', 'blob', 'resend', 'auth', 'new_service'));
```

## 🐛 Troubleshooting

### "INTEGRATION_ENCRYPTION_KEY is not set"
Add the key to your `.env.local` file. Generate one with:
```bash
openssl rand -base64 32
```

### "Failed to decrypt integration configuration"
- The encryption key has changed
- The data was corrupted
- The data was not properly encrypted
**Solution:** Re-save the integration with the correct key

### "Connection test failed"
- Check network connectivity
- Verify credentials are correct
- Check if the service is online
- Ensure proper permissions/scopes

## 📚 Related Documentation

- [Supabase Integration Guide](../../docs/integrations/supabase-integration.mdx)
- [Architecture Overview](../../docs/integrations/architecture.mdx)
- [Security Best Practices](../../docs/integrations/security.mdx)

## 🤝 Contributing

When adding new integration types:
1. Follow the existing patterns
2. Add comprehensive validation
3. Include connection testing
4. Update this README
5. Add migration scripts
6. Update TypeScript types

