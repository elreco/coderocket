import { createClient } from "@/utils/supabase/server";

import { decryptIntegrationConfig } from "./encryption";
import {
  IntegrationType,
  ChatIntegrationWithDetails,
  SupabaseIntegrationConfig,
} from "./types";
import { validateSupabaseSchema } from "./validators";

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
): Promise<{ context: string; errors: string[] }> {
  if (integrations.length === 0) {
    return { context: "", errors: [] };
  }

  const contextParts: string[] = [];
  const errors: string[] = [];

  for (const integration of integrations) {
    const { user_integrations } = integration;

    if (user_integrations.integration_type === IntegrationType.SUPABASE) {
      const decryptedConfig =
        decryptIntegrationConfig<SupabaseIntegrationConfig>(
          user_integrations.config as unknown as string,
        );

      const schemaValidation = validateSupabaseSchema(decryptedConfig);
      if (!schemaValidation.valid) {
        errors.push(
          `Supabase integration "${user_integrations.name}": ${schemaValidation.error}`,
        );
        continue;
      }

      const supabaseContext = await buildSupabaseContext(decryptedConfig);
      contextParts.push(supabaseContext);
    }
  }

  return {
    context: contextParts.join("\n\n"),
    errors,
  };
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
<backend_integration type="supabase" status="active">
  <database_context>
    ⚠️ IMPORTANT: The user has ACTIVELY ENABLED Supabase integration for this project.
    This means they WANT to use database features and expect you to implement them.

    You have access to a Supabase backend with the following configuration:
    - Database: PostgreSQL with Row Level Security (RLS)
    - Real-time subscriptions available
    - Built-in authentication system
    - The integration is READY and CONFIGURED - use it proactively!

    ${schemaInfo}

    💡 PROACTIVE USAGE:
    - When the user requests ANY feature that could benefit from data persistence, USE Supabase
    - Don't ask if they want database functionality - they already enabled it by selecting the integration
    - Examples: todo lists, user profiles, product catalogs, comments, posts, settings, etc.
    - Even for simple features, consider adding database persistence to make the app more complete
    - If they just say "create a dashboard", proactively add database-backed data instead of mock data
  </database_context>

  <backend_generation_rules>
    1. **CRITICAL - Credentials Management**:
       ⚠️ ABSOLUTE RULES - NO EXCEPTIONS:
       - NEVER, EVER create files named: .env, .env.local, .env.example, .env.development, .env.production, or ANY .env file
       - NEVER create documentation files: README.md, SETUP.md, INSTALL.md, SUPABASE_SETUP.md, or ANY documentation file
       - NEVER mention in your response: "create .env", "add credentials", "configure environment variables", "setup required"
       - NEVER explain how to configure Supabase or environment variables

       ✅ What you MUST do:
       - Simply use import.meta.env.VITE_SUPABASE_URL and import.meta.env.VITE_SUPABASE_ANON_KEY in your code
       - The credentials are ALREADY configured and AUTOMATICALLY injected by the platform
       - The code you generate will work IMMEDIATELY without any configuration
       - If you mention Supabase in your response, say: "The application is ready to use with Supabase integration"

       🔍 Environment Variables Injection:
       - In the PREVIEW (webcontainer): credentials are automatically injected as environment variables via .env.local
       - In the BUILD (Fly.io deployment): credentials are automatically injected into the build process
       - BOTH environments have full access to your real Supabase credentials
       - The code will connect to your REAL database in both preview and deployed versions

    2. **Client-Side Supabase Integration**:
       - Generate code that calls Supabase directly from the client (browser)
       - Use environment variables for project URL and anon key (they're already available)
       - NEVER hardcode credentials in the code
       - Use the Supabase client for all database operations

    3. **TypeScript Types for Database** (OPTIONAL - Pragmatic Approach):

       🎯 PRIORITY: Make the app WORK first, types are secondary!

       You have TWO options for Supabase types:

       **OPTION A - Quick & Simple (RECOMMENDED)**: Use 'any' type
       \`\`\`typescript
       import { createClient } from '@supabase/supabase-js'

       const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
       const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

       export const supabase = createClient(supabaseUrl, supabaseAnonKey)
       \`\`\`

       In services, use simple types or 'any':
       \`\`\`typescript
       export async function getCategories() {
         const { data, error } = await supabase
           .from('categories')
           .select('*')

         if (error) throw error
         return data as any[]
       }
       \`\`\`

       **OPTION B - Advanced Strict Types (RARE - Only if explicitly requested)**:
       Only generate strict database types if user specifically asks with phrases like:
       - "with strict TypeScript types"
       - "with full type safety"
       - "generate database types"

       Otherwise, ALWAYS use Option A!

    4. **Database Schema & Migrations**:
       When user requests features requiring database tables, generate:
       a) SQL migration file with CREATE TABLE statements
       b) Row Level Security (RLS) policies for security
       c) TypeScript types are OPTIONAL - only if user asks for strict typing

       Migration file format:
       - Use proper PostgreSQL types and constraints
       - Always use UUID for primary keys: id uuid primary key default uuid_generate_v4()
       - Include timestamps: created_at timestamptz default now()
       - Enable RLS: alter table tablename enable row level security;
       - Create appropriate RLS policies for data access control

    5. **Service Layer Pattern**:
       Create service files that encapsulate database operations:
       - Keep components clean and focused on UI
       - Centralize data fetching logic
       - Handle errors gracefully
       - Return typed data

    6. **File Organization**:
       - Migrations: /supabase/migrations/YYYYMMDD_description.sql
       - Supabase Client: /src/lib/supabase.ts (without Database type parameter by default)
       - Services: /src/services/[resource].ts (use 'any' for quick development)

    7. **Environment Types**:
       CRITICAL: You MUST generate type definitions for import.meta.env:

       **React**: Create src/vite-env.d.ts:
       \`\`\`typescript
       /// <reference types="vite/client" />

       interface ImportMetaEnv {
         readonly VITE_SUPABASE_URL: string
         readonly VITE_SUPABASE_ANON_KEY: string
       }

       interface ImportMeta {
         readonly env: ImportMetaEnv
       }
       \`\`\`

       **Vue/Svelte**: File already exists in boilerplate, just add the env variables to it.

       **Angular**: File already exists in boilerplate, just add the env variables to it.

    8. **Supabase Client Setup** (Use SIMPLE version by default):
       Always generate the Supabase client with framework-specific initialization:

       **React/Vue/Svelte**: /src/lib/supabase.ts (SIMPLE - NO TYPES)
       \`\`\`typescript
       import { createClient } from '@supabase/supabase-js'

       const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
       const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

       export const supabase = createClient(supabaseUrl, supabaseAnonKey)
       \`\`\`

       ⚠️ Do NOT add Database type parameter unless user specifically asks for strict typing!

       **Angular**: /src/app/services/supabase.service.ts
       \`\`\`typescript
       import { Injectable } from '@angular/core';
       import { createClient, SupabaseClient } from '@supabase/supabase-js';

       @Injectable({
         providedIn: 'root'
       })
       export class SupabaseService {
         private supabase: SupabaseClient;

         constructor() {
           const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
           const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
           this.supabase = createClient(supabaseUrl, supabaseKey);
         }

         get client(): SupabaseClient {
           return this.supabase;
         }
       }
       \`\`\`

    9. **Service Layer Examples** (Framework-specific patterns):

       **React/Vue/Svelte**: /src/services/posts.ts
       \`\`\`typescript
       import { supabase } from '@/lib/supabase'

       export async function getPosts() {
         const { data, error } = await supabase
           .from('posts')
           .select('*')
           .order('created_at', { ascending: false })

         if (error) throw error
         return (data || []) as any[]
       }

       export async function createPost(post: any) {
         const { data, error } = await supabase
           .from('posts')
           .insert(post)
           .select()
           .single()

         if (error) throw error
         return data as any
       }
       \`\`\`

       **Angular**: /src/app/services/posts.service.ts
       \`\`\`typescript
       import { Injectable } from '@angular/core';
       import { SupabaseService } from './supabase.service';

       @Injectable({
         providedIn: 'root'
       })
       export class PostsService {
         constructor(private supabase: SupabaseService) {}

         async getPosts() {
           const { data, error } = await this.supabase.client
             .from('posts')
             .select('*')
             .order('created_at', { ascending: false });

           if (error) throw error;
           return data;
         }
       }
       \`\`\`

    9. **Migration SQL Format**:
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

    10. **Pragmatic TypeScript Approach**:
        - The project is configured with TypeScript in PERMISSIVE mode
        - strict: false, noImplicitAny: false - types are NOT blocking!
        - PREFER using 'any' or simple types over complex type definitions
        - If you get TypeScript errors, use 'as any' casting to make it work
        - The goal is to make the app FUNCTIONAL, not type-perfect
        - In services, return data with 'as any' or 'as any[]' to avoid type inference issues

    11. **Package.json Dependencies**:
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
    - Use <coderocketFile name="src/types/database.ts"> for database types

    **React/Vue/Svelte**:
    - Use <coderocketFile name="src/lib/supabase.ts"> for Supabase client
    - Use <coderocketFile name="src/services/[resource].ts"> for service layers
    - For React: Use <coderocketFile name="src/vite-env.d.ts"> to declare env types

    **Angular**:
    - Use <coderocketFile name="src/app/services/supabase.service.ts"> for Supabase service
    - Use <coderocketFile name="src/app/services/[resource].service.ts"> for service layers

    ⚠️ CRITICAL RULES:
    - The user will copy the migration SQL and run it in their Supabase dashboard
    - Make sure migrations are complete, well-documented, and include all necessary RLS policies
    - NEVER create .env files or documentation files (README, SETUP, etc.)
    - NEVER mention "setup", "configure", or "add credentials" in your response
    - The application is ready to use immediately - credentials are auto-injected

    In your response text, simply say something like:
    "The application is ready with Supabase integration. Copy the migration SQL to your Supabase dashboard to create the database tables."
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
