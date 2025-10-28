import { createClient } from "@/utils/supabase/server";

import { decryptIntegrationConfig } from "./encryption";
import {
  IntegrationType,
  ChatIntegrationWithDetails,
  SupabaseIntegrationConfig,
} from "./types";

export async function getActiveChatIntegrations(
  chatId: string,
): Promise<ChatIntegrationWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_integrations")
    .select(
      `
      *,
      user_integrations (
        id,
        user_id,
        integration_type,
        name,
        config,
        is_active,
        created_at,
        updated_at
      )
    `,
    )
    .eq("chat_id", chatId)
    .eq("is_enabled", true);

  if (error) {
    console.error("Error fetching chat integrations:", error);
    return [];
  }

  return (data || []) as unknown as ChatIntegrationWithDetails[];
}

export async function buildIntegrationContext(
  integrations: ChatIntegrationWithDetails[],
): Promise<string> {
  if (integrations.length === 0) {
    return "";
  }

  const contextParts: string[] = [];

  for (const integration of integrations) {
    const { user_integrations } = integration;

    if (user_integrations.integration_type === IntegrationType.SUPABASE) {
      const decryptedConfig = await decryptIntegrationConfig(
        user_integrations.config as SupabaseIntegrationConfig,
      );
      const supabaseContext = await buildSupabaseContext(decryptedConfig);
      contextParts.push(supabaseContext);
    }
  }

  return contextParts.join("\n\n");
}

async function buildSupabaseContext(
  config: SupabaseIntegrationConfig,
): Promise<string> {
  const hasSchema = config.databaseSchema?.tables?.length ?? 0 > 0;

  let schemaInfo = "";
  if (hasSchema && config.databaseSchema) {
    schemaInfo = formatDatabaseSchema(config.databaseSchema);
  }

  return `
<backend_integration type="supabase">
  <database_context>
    You have access to a Supabase backend with the following configuration:
    - Database: PostgreSQL with Row Level Security (RLS)
    - Real-time subscriptions available
    - Built-in authentication system

    ${schemaInfo}
  </database_context>

  <backend_generation_rules>
    1. **Client-Side Supabase Integration**:
       - Generate code that calls Supabase directly from the client (browser)
       - Use environment variables for project URL and anon key
       - NEVER hardcode credentials in the code
       - Use the Supabase client for all database operations

    2. **Database Schema & Migrations**:
       When user requests features requiring database tables, generate:
       a) SQL migration file with CREATE TABLE statements
       b) TypeScript types matching the schema
       c) Row Level Security (RLS) policies for security

       Migration file format:
       - Use proper PostgreSQL types and constraints
       - Always use UUID for primary keys: id uuid primary key default uuid_generate_v4()
       - Include timestamps: created_at timestamptz default now()
       - Enable RLS: alter table tablename enable row level security;
       - Create appropriate RLS policies for data access control

    3. **Service Layer Pattern**:
       Create service files that encapsulate database operations:
       - Keep components clean and focused on UI
       - Centralize data fetching logic
       - Handle errors gracefully
       - Return typed data

    4. **File Organization**:
       - Migrations: /supabase/migrations/YYYYMMDD_description.sql
       - Types: /src/types/database.ts
       - Supabase Client: /src/lib/supabase.ts
       - Services: /src/services/[resource].ts
       - Environment: .env.local.example

    5. **Supabase Client Setup**:
       Always generate /src/lib/supabase.ts with proper client initialization:

       \`\`\`typescript
       import { createClient } from '@supabase/supabase-js'

       const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
       const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

       export const supabase = createClient(supabaseUrl, supabaseAnonKey)
       \`\`\`

    6. **Service Layer Example**:
       \`\`\`typescript
       import { supabase } from '@/lib/supabase'

       export async function getPosts() {
         const { data, error } = await supabase
           .from('posts')
           .select('*')
           .order('created_at', { ascending: false })

         if (error) throw error
         return data
       }
       \`\`\`

    7. **Migration SQL Format**:
       \`\`\`sql
       -- Migration: Create posts table
       -- Generated at: [timestamp]

       create table if not exists public.posts (
         id uuid primary key default uuid_generate_v4(),
         user_id uuid references auth.users,
         title text not null,
         content text,
         created_at timestamptz default now() not null,
         updated_at timestamptz default now() not null
       );

       -- Enable Row Level Security
       alter table public.posts enable row level security;

       -- RLS Policies
       create policy "Users can view all posts"
         on public.posts for select
         using (true);

       create policy "Users can create their own posts"
         on public.posts for insert
         with check (auth.uid() = user_id);

       create policy "Users can update their own posts"
         on public.posts for update
         using (auth.uid() = user_id);

       create policy "Users can delete their own posts"
         on public.posts for delete
         using (auth.uid() = user_id);
       \`\`\`

    8. **Environment Variables**:
       Always generate .env.local.example:
       \`\`\`
       VITE_SUPABASE_URL=your-project-url
       VITE_SUPABASE_ANON_KEY=your-anon-key
       \`\`\`

    9. **TypeScript Types**:
       Generate database types for type safety:
       \`\`\`typescript
       export interface Database {
         public: {
           Tables: {
             posts: {
               Row: {
                 id: string
                 user_id: string | null
                 title: string
                 content: string | null
                 created_at: string
                 updated_at: string
               }
               Insert: {
                 id?: string
                 user_id?: string | null
                 title: string
                 content?: string | null
                 created_at?: string
                 updated_at?: string
               }
               Update: {
                 id?: string
                 user_id?: string | null
                 title?: string
                 content?: string | null
                 updated_at?: string
               }
             }
           }
         }
       }
       \`\`\`

    10. **Package.json Dependencies**:
        Always add @supabase/supabase-js to dependencies:
        \`\`\`json
        {
          "dependencies": {
            "@supabase/supabase-js": "^2.45.0"
          }
        }
        \`\`\`

    11. **Real-time Features** (if requested):
        \`\`\`typescript
        const channel = supabase
          .channel('posts-changes')
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'posts' },
            (payload) => {
              console.log('Change received!', payload)
            }
          )
          .subscribe()
        \`\`\`

    12. **Authentication** (if requested):
        \`\`\`typescript
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: 'user@example.com',
          password: 'password'
        })

        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'user@example.com',
          password: 'password'
        })

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        // Sign out
        await supabase.auth.signOut()
        \`\`\`
  </backend_generation_rules>

  <coderocket_artifact_backend>
    When generating backend code with Supabase:
    - Use <coderocketFile name="supabase/migrations/YYYYMMDD_description.sql"> for migrations
    - Use <coderocketFile name="src/services/[resource].ts"> for service layers
    - Use <coderocketFile name="src/types/database.ts"> for database types
    - Use <coderocketFile name="src/lib/supabase.ts"> for Supabase client configuration
    - Use <coderocketFile name=".env.local.example"> to document required environment variables

    CRITICAL: The user will copy the migration SQL and run it manually in their Supabase dashboard.
    Make sure migrations are complete, well-documented, and include all necessary RLS policies.
  </coderocket_artifact_backend>

  <best_practices>
    - Always use typed responses from Supabase
    - Handle errors gracefully with try-catch
    - Use RLS policies instead of server-side auth checks
    - Keep service functions small and focused
    - Use transactions for multi-table operations
    - Add indexes for frequently queried columns
    - Use postgres functions for complex operations
    - Never expose sensitive data without RLS policies
  </best_practices>
</backend_integration>
`.trim();
}

function formatDatabaseSchema(
  schema: SupabaseIntegrationConfig["databaseSchema"],
): string {
  if (!schema || !schema.tables || schema.tables.length === 0) {
    return "";
  }

  const tableDescriptions = schema.tables
    .map((table) => {
      const columns = table.columns
        .map(
          (col) =>
            `      - ${col.name}: ${col.type}${col.isPrimaryKey ? " (PK)" : ""}${!col.isNullable ? " NOT NULL" : ""}`,
        )
        .join("\n");

      return `    Table: ${table.name}\n${columns}`;
    })
    .join("\n\n");

  return `
    <existing_schema>
      The following database schema already exists:

${tableDescriptions}

      When adding new tables, ensure they integrate well with existing schema.
      Reference existing tables with foreign keys when appropriate.
    </existing_schema>
  `;
}
