export enum IntegrationType {
  SUPABASE = "supabase",
  STRIPE = "stripe",
  BLOB = "blob",
  RESEND = "resend",
  AUTH = "auth",
  FIGMA = "figma",
}

export interface SupabaseTableColumn {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface SupabaseTable {
  name: string;
  columns: SupabaseTableColumn[];
  rls?: {
    enabled: boolean;
    policies?: Array<{
      name: string;
      operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
      using?: string;
      withCheck?: string;
    }>;
  };
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}

export interface SupabaseIntegrationConfig {
  projectUrl: string;
  anonKey: string;
  accessToken?: string;
  projectId?: string;
  databaseSchema?: {
    tables: SupabaseTable[];
  };
}

export interface StripeIntegrationConfig {
  publishableKey: string;
  secretKey?: string;
  webhookSecret?: string;
  mode: "test" | "live";
  features?: {
    payments?: boolean;
    subscriptions?: boolean;
    checkout?: boolean;
  };
}

export interface BlobIntegrationConfig {
  token: string;
  storeId?: string;
  features?: {
    imageUpload?: boolean;
    fileStorage?: boolean;
    cdn?: boolean;
  };
}

export interface ResendIntegrationConfig {
  apiKey: string;
  fromEmail: string;
  features?: {
    transactional?: boolean;
    marketing?: boolean;
  };
}

export interface AuthIntegrationConfig {
  providers: Array<"google" | "github" | "email" | "phone">;
  redirectUrl?: string;
  features?: {
    emailVerification?: boolean;
    passwordReset?: boolean;
    oauth?: boolean;
  };
}

export interface FigmaIntegrationConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  features?: {
    importDesigns?: boolean;
    exportCode?: boolean;
    syncUpdates?: boolean;
  };
}

export type IntegrationConfig =
  | SupabaseIntegrationConfig
  | StripeIntegrationConfig
  | BlobIntegrationConfig
  | ResendIntegrationConfig
  | AuthIntegrationConfig
  | FigmaIntegrationConfig;

export interface UserIntegration {
  id: string;
  user_id: string;
  integration_type: IntegrationType;
  name: string;
  config: IntegrationConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatIntegration {
  id: string;
  chat_id: string;
  integration_id: string;
  is_enabled: boolean;
  config_override?: Partial<IntegrationConfig>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSchema {
  id: string;
  chat_id: string;
  integration_id: string;
  schema_definition: {
    tables?: SupabaseTable[];
    endpoints?: Array<{
      path: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      description: string;
    }>;
  };
  generated_files: Array<{
    path: string;
    content: string;
    type: "backend" | "types" | "config" | "env";
  }>;
  created_at: string;
  updated_at: string;
}

export interface ChatIntegrationWithDetails extends ChatIntegration {
  user_integrations: UserIntegration;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    projectName?: string;
    region?: string;
    tables?: string[];
    latency?: number;
    mode?: string;
  };
}

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  details?: {
    latency?: number;
    version?: string;
    features?: string[];
  };
}
