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

      const hasSchema =
        (decryptedConfig.databaseSchema?.tables?.length ?? 0) > 0;

      if (hasSchema) {
        const schemaValidation = validateSupabaseSchema(decryptedConfig);
        if (!schemaValidation.valid) {
          decryptedConfig.databaseSchema = undefined;
        }
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
    ⚠️ IMPORTANT: The user has enabled "App Data" for this project.
    This means they WANT their app to save data, upload files, and manage user accounts.

    You have access to a cloud backend (powered by Supabase) with:
    - Save your data: Store and retrieve any data your app needs
    - Upload files: Images, videos, PDFs, documents - any file type
    - User accounts: Let users sign up, log in, and have their own data
    - Real-time updates: Data syncs instantly across all users
    - The backend is READY and CONFIGURED - use it proactively!

    ${schemaInfo}

    💡 PROACTIVE USAGE:
    - When the user requests ANY feature that could benefit from saving data, implement it!
    - Don't ask if they want to save data - they already enabled App Data
    - Examples: todo lists, user profiles, product catalogs, comments, posts, settings, etc.
    - Even for simple features, save the data so it persists between sessions
    - If they just say "create a dashboard", proactively save data instead of using fake/mock data
  </database_context>

  <storage_context>
    ⚠️ IMPORTANT: File uploads are AVAILABLE!
    When the user needs to upload files (images, videos, PDFs, documents, etc.), implement it directly.

    📦 FILE UPLOAD CAPABILITIES:
    - Upload ANY file type: images (PNG, JPG, GIF, WebP), videos (MP4, WebM), PDFs, documents, etc.
    - Files are stored securely and accessible via public URLs
    - Supports large files (up to 50MB by default, configurable)
    - Built-in CDN for fast delivery
    - Works 100% from the browser (no extra server needed)

    💡 PROACTIVE USAGE:
    - When user asks for: "upload images", "file upload", "profile picture", "gallery", "media library" → Implement file uploads
    - When user creates apps like: social media, e-commerce, portfolio, blog with images → Include file uploads
    - Don't ask if they want file upload - implement it directly if it makes sense for the feature
  </storage_context>

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
       - In your response, say something simple like: "Your app is ready! Data will be saved automatically." or "Your app can now save data and upload files."
       - AVOID technical jargon like "Supabase", "database", "PostgreSQL", "backend" - use simple terms like "save data", "your app's data", "upload files"

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

    13. **File Storage & Uploads**:
        When the user needs file upload functionality, generate:

        a) **Migration to create storage bucket and policies**:
        \`\`\`sql
        -- Create storage bucket for uploads
        insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values (
          'uploads',
          'uploads',
          true,
          52428800, -- 50MB limit
          array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']
        );

        -- Allow authenticated users to upload files
        create policy "Authenticated users can upload files"
          on storage.objects for insert
          with check (
            bucket_id = 'uploads'
            and auth.role() = 'authenticated'
          );

        -- Allow public read access to files
        create policy "Public read access"
          on storage.objects for select
          using (bucket_id = 'uploads');

        -- Allow users to delete their own files
        create policy "Users can delete own files"
          on storage.objects for delete
          using (
            bucket_id = 'uploads'
            and auth.uid()::text = (storage.foldername(name))[1]
          );
        \`\`\`

        b) **Upload service** (src/services/storage.ts):
        \`\`\`typescript
        import { supabase } from '@/lib/supabase'

        export async function uploadFile(file: File, folder: string = 'public') {
          const fileExt = file.name.split('.').pop()
          const fileName = \`\${folder}/\${Date.now()}-\${Math.random().toString(36).substring(7)}.\${fileExt}\`

          const { data, error } = await supabase.storage
            .from('uploads')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (error) throw error

          const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(data.path)

          return { path: data.path, publicUrl }
        }

        export async function deleteFile(path: string) {
          const { error } = await supabase.storage
            .from('uploads')
            .remove([path])

          if (error) throw error
        }

        export function getPublicUrl(path: string) {
          const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(path)
          return publicUrl
        }
        \`\`\`

        c) **React upload component example**:
        \`\`\`tsx
        import { useState } from 'react'
        import { uploadFile } from '@/services/storage'

        export function FileUpload({ onUpload }: { onUpload: (url: string) => void }) {
          const [uploading, setUploading] = useState(false)

          const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file) return

            setUploading(true)
            try {
              const { publicUrl } = await uploadFile(file)
              onUpload(publicUrl)
            } catch (error) {
              console.error('Upload failed:', error)
            } finally {
              setUploading(false)
            }
          }

          return (
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              accept="image/*,video/*,.pdf"
            />
          )
        }
        \`\`\`

        📋 BUCKET CONFIGURATION OPTIONS:
        - \`public: true\` → Files are publicly accessible via URL
        - \`public: false\` → Files require signed URLs (more secure)
        - \`file_size_limit\` → Max file size in bytes (default 50MB = 52428800)
        - \`allowed_mime_types\` → Restrict file types (array of MIME types)

        🎯 COMMON BUCKET CONFIGURATIONS:
        - Profile avatars: public, 5MB limit, images only
        - User documents: private, 50MB limit, PDFs and images
        - Media gallery: public, 100MB limit, images and videos
        - Product images: public, 10MB limit, images only
  </backend_generation_rules>

  <coderocket_artifact_backend>
    When generating backend code with Supabase:
    - Use <coderocketFile name="supabase/migrations/YYYYMMDD_description.sql"> for migrations
    - Use <coderocketFile name="src/types/database.ts"> for database types

    **React/Vue/Svelte**:
    - Use <coderocketFile name="src/lib/supabase.ts"> for Supabase client
    - Use <coderocketFile name="src/services/[resource].ts"> for service layers
    - Use <coderocketFile name="src/services/storage.ts"> for file upload service
    - For React: Use <coderocketFile name="src/vite-env.d.ts"> to declare env types

    **Angular**:
    - Use <coderocketFile name="src/app/services/supabase.service.ts"> for Supabase service
    - Use <coderocketFile name="src/app/services/[resource].service.ts"> for service layers
    - Use <coderocketFile name="src/app/services/storage.service.ts"> for file upload service

    ⚠️ CRITICAL RULES:
    - The user will copy the migration SQL and run it in their Supabase dashboard
    - Make sure migrations are complete, well-documented, and include all necessary RLS policies
    - For file uploads, ALWAYS include the storage bucket creation and policies in the migration
    - NEVER create .env files or documentation files (README, SETUP, etc.)
    - NEVER mention "setup", "configure", or "add credentials" in your response
    - The application is ready to use immediately - credentials are auto-injected

    📝 USER-FRIENDLY RESPONSE GUIDELINES:
    In your response text, use SIMPLE language that non-developers understand:

    ✅ GOOD (simple, user-friendly):
    - "Your app is ready! Data will be saved automatically."
    - "Your app can now save data, upload files, and manage user accounts."
    - "To finish setup, copy the SQL code below to your Supabase dashboard."
    - "Users can now create accounts and their data will be saved."
    - "Files uploaded by users will be stored securely."

    ❌ AVOID (too technical):
    - "Supabase integration configured"
    - "Database operations are ready"
    - "PostgreSQL backend is connected"
    - "RLS policies have been applied"
    - "The migration creates tables with foreign keys"

    When you need to mention technical details (like running migrations), keep it minimal:
    "To complete the setup, copy the SQL code to your Supabase dashboard → SQL Editor → New query → Run."
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
