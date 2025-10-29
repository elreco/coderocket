export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "11.2.0 (c820efb)";
  };
  public: {
    Tables: {
      api_clients: {
        Row: {
          api_key: string;
          client_name: string;
          created_at: string | null;
          credit_balance: number;
          email: string;
          id: string;
          last_used_at: string | null;
        };
        Insert: {
          api_key: string;
          client_name: string;
          created_at?: string | null;
          credit_balance?: number;
          email: string;
          id?: string;
          last_used_at?: string | null;
        };
        Update: {
          api_key?: string;
          client_name?: string;
          created_at?: string | null;
          credit_balance?: number;
          email?: string;
          id?: string;
          last_used_at?: string | null;
        };
        Relationships: [];
      };
      api_usage: {
        Row: {
          client_id: string | null;
          cost: number;
          created_at: string | null;
          framework: string;
          has_image: boolean;
          id: number;
          input_tokens: number;
          output_tokens: number;
          prompt: string;
        };
        Insert: {
          client_id?: string | null;
          cost: number;
          created_at?: string | null;
          framework: string;
          has_image?: boolean;
          id?: number;
          input_tokens: number;
          output_tokens: number;
          prompt: string;
        };
        Update: {
          client_id?: string | null;
          cost?: number;
          created_at?: string | null;
          framework?: string;
          has_image?: boolean;
          id?: number;
          input_tokens?: number;
          output_tokens?: number;
          prompt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_usage_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "api_clients";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_likes: {
        Row: {
          chat_id: string;
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          chat_id: string;
          created_at?: string;
          id?: number;
          user_id: string;
        };
        Update: {
          chat_id?: string;
          created_at?: string;
          id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_likes_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chats: {
        Row: {
          artifact_code: string | null;
          clone_url: string | null;
          created_at: string | null;
          framework: string | null;
          github_repo_name: string | null;
          github_repo_url: string | null;
          id: string;
          input_tokens: number | null;
          is_featured: boolean | null;
          is_private: boolean | null;
          last_github_commit_sha: string | null;
          last_github_sync: string | null;
          likes: number | null;
          metadata: Json | null;
          output_tokens: number | null;
          prompt_image: string | null;
          remix_chat_id: string | null;
          remix_from_version: number | null;
          slug: string | null;
          title: string | null;
          user_id: string;
          views: number | null;
        };
        Insert: {
          artifact_code?: string | null;
          clone_url?: string | null;
          created_at?: string | null;
          framework?: string | null;
          github_repo_name?: string | null;
          github_repo_url?: string | null;
          id?: string;
          input_tokens?: number | null;
          is_featured?: boolean | null;
          is_private?: boolean | null;
          last_github_commit_sha?: string | null;
          last_github_sync?: string | null;
          likes?: number | null;
          metadata?: Json | null;
          output_tokens?: number | null;
          prompt_image?: string | null;
          remix_chat_id?: string | null;
          remix_from_version?: number | null;
          slug?: string | null;
          title?: string | null;
          user_id: string;
          views?: number | null;
        };
        Update: {
          artifact_code?: string | null;
          clone_url?: string | null;
          created_at?: string | null;
          framework?: string | null;
          github_repo_name?: string | null;
          github_repo_url?: string | null;
          id?: string;
          input_tokens?: number | null;
          is_featured?: boolean | null;
          is_private?: boolean | null;
          last_github_commit_sha?: string | null;
          last_github_sync?: string | null;
          likes?: number | null;
          metadata?: Json | null;
          output_tokens?: number | null;
          prompt_image?: string | null;
          remix_chat_id?: string | null;
          remix_from_version?: number | null;
          slug?: string | null;
          title?: string | null;
          user_id?: string;
          views?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "chats_remix_chat_id_fkey";
            columns: ["remix_chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chats_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [];
      };
      ekinox_waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      extra_messages: {
        Row: {
          count: number;
          created_at: string;
          id: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          count?: number;
          created_at?: string;
          id?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          count?: number;
          created_at?: string;
          id?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      github_connections: {
        Row: {
          access_token: string;
          connected_at: string;
          github_username: string;
          id: number;
          last_sync_at: string | null;
          refresh_token: string | null;
          user_id: string;
        };
        Insert: {
          access_token: string;
          connected_at?: string;
          github_username: string;
          id?: number;
          last_sync_at?: string | null;
          refresh_token?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string;
          connected_at?: string;
          github_username?: string;
          id?: number;
          last_sync_at?: string | null;
          refresh_token?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      marketplace_categories: {
        Row: {
          created_at: string;
          description: string | null;
          icon: string | null;
          id: number;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: number;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: number;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      marketplace_earnings: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: string;
          payout_date: string | null;
          purchase_id: string;
          seller_id: string;
          status: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          id?: string;
          payout_date?: string | null;
          purchase_id: string;
          seller_id: string;
          status?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          payout_date?: string | null;
          purchase_id?: string;
          seller_id?: string;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_earnings_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_earnings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_listings: {
        Row: {
          category_id: number;
          chat_id: string;
          created_at: string;
          currency: string;
          description: string;
          id: string;
          is_active: boolean | null;
          preview_image_url: string | null;
          price_cents: number;
          seller_id: string;
          title: string;
          total_sales: number | null;
          updated_at: string;
          version: number;
        };
        Insert: {
          category_id: number;
          chat_id: string;
          created_at?: string;
          currency?: string;
          description: string;
          id?: string;
          is_active?: boolean | null;
          preview_image_url?: string | null;
          price_cents: number;
          seller_id: string;
          title: string;
          total_sales?: number | null;
          updated_at?: string;
          version?: number;
        };
        Update: {
          category_id?: number;
          chat_id?: string;
          created_at?: string;
          currency?: string;
          description?: string;
          id?: string;
          is_active?: boolean | null;
          preview_image_url?: string | null;
          price_cents?: number;
          seller_id?: string;
          title?: string;
          total_sales?: number | null;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_listings_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_payouts: {
        Row: {
          amount_cents: number;
          arrival_date: string | null;
          created_at: string;
          currency: string;
          earnings_ids: string[];
          failure_reason: string | null;
          id: string;
          seller_id: string;
          status: string | null;
          stripe_payout_id: string | null;
        };
        Insert: {
          amount_cents: number;
          arrival_date?: string | null;
          created_at?: string;
          currency?: string;
          earnings_ids: string[];
          failure_reason?: string | null;
          id?: string;
          seller_id: string;
          status?: string | null;
          stripe_payout_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          arrival_date?: string | null;
          created_at?: string;
          currency?: string;
          earnings_ids?: string[];
          failure_reason?: string | null;
          id?: string;
          seller_id?: string;
          status?: string | null;
          stripe_payout_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_payouts_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_purchases: {
        Row: {
          buyer_id: string;
          chat_id: string;
          created_at: string;
          currency: string;
          id: string;
          listing_id: string;
          platform_commission_cents: number;
          price_paid_cents: number;
          purchased_chat_id: string | null;
          seller_earning_cents: number;
          seller_id: string;
          stripe_payment_intent_id: string | null;
        };
        Insert: {
          buyer_id: string;
          chat_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          listing_id: string;
          platform_commission_cents: number;
          price_paid_cents: number;
          purchased_chat_id?: string | null;
          seller_earning_cents: number;
          seller_id: string;
          stripe_payment_intent_id?: string | null;
        };
        Update: {
          buyer_id?: string;
          chat_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          listing_id?: string;
          platform_commission_cents?: number;
          price_paid_cents?: number;
          purchased_chat_id?: string | null;
          seller_earning_cents?: number;
          seller_id?: string;
          stripe_payment_intent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_purchases_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_purchases_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_purchases_purchased_chat_id_fkey";
            columns: ["purchased_chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketplace_purchases_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          artifact_code: string | null;
          cache_creation_input_tokens: number | null;
          cache_read_input_tokens: number | null;
          chat_id: string;
          content: string;
          created_at: string;
          files: Json | null;
          id: number;
          input_tokens: number | null;
          is_built: boolean | null;
          is_github_pull: boolean | null;
          migration_executed_at: string | null;
          output_tokens: number | null;
          prompt_image: string | null;
          role: string;
          screenshot: string | null;
          subscription_type: string | null;
          theme: string | null;
          version: number;
        };
        Insert: {
          artifact_code?: string | null;
          cache_creation_input_tokens?: number | null;
          cache_read_input_tokens?: number | null;
          chat_id: string;
          content: string;
          created_at?: string;
          files?: Json | null;
          id?: number;
          input_tokens?: number | null;
          is_built?: boolean | null;
          is_github_pull?: boolean | null;
          migration_executed_at?: string | null;
          output_tokens?: number | null;
          prompt_image?: string | null;
          role: string;
          screenshot?: string | null;
          subscription_type?: string | null;
          theme?: string | null;
          version: number;
        };
        Update: {
          artifact_code?: string | null;
          cache_creation_input_tokens?: number | null;
          cache_read_input_tokens?: number | null;
          chat_id?: string;
          content?: string;
          created_at?: string;
          files?: Json | null;
          id?: number;
          input_tokens?: number | null;
          is_built?: boolean | null;
          is_github_pull?: boolean | null;
          migration_executed_at?: string | null;
          output_tokens?: number | null;
          prompt_image?: string | null;
          role?: string;
          screenshot?: string | null;
          subscription_type?: string | null;
          theme?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
        ];
      };
      notification: {
        Row: {
          button_label: string | null;
          button_link: string | null;
          created_at: string;
          description: string;
          id: number;
          is_active: boolean;
          title: string;
        };
        Insert: {
          button_label?: string | null;
          button_link?: string | null;
          created_at?: string;
          description: string;
          id?: number;
          is_active: boolean;
          title: string;
        };
        Update: {
          button_label?: string | null;
          button_link?: string | null;
          created_at?: string;
          description?: string;
          id?: number;
          is_active?: boolean;
          title?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number | null;
          amount_euro: number | null;
          created: string | null;
          description: string | null;
          email: string | null;
          payment_currency: string | null;
          payment_id: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          amount?: number | null;
          amount_euro?: number | null;
          created?: string | null;
          description?: string | null;
          email?: string | null;
          payment_currency?: string | null;
          payment_id: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          amount?: number | null;
          amount_euro?: number | null;
          created?: string | null;
          description?: string | null;
          email?: string | null;
          payment_currency?: string | null;
          payment_id?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [];
      };
      prices: {
        Row: {
          active: boolean | null;
          currency: string | null;
          description: string | null;
          id: string;
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null;
          interval_count: number | null;
          metadata: Json | null;
          product_id: string | null;
          trial_period_days: number | null;
          type: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount: number | null;
        };
        Insert: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id: string;
          interval?:
            | Database["public"]["Enums"]["pricing_plan_interval"]
            | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount?: number | null;
        };
        Update: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          interval?:
            | Database["public"]["Enums"]["pricing_plan_interval"]
            | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean | null;
          description: string | null;
          id: string;
          image: string | null;
          metadata: Json | null;
          name: string | null;
        };
        Insert: {
          active?: boolean | null;
          description?: string | null;
          id: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Update: {
          active?: boolean | null;
          description?: string | null;
          id?: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          created: string;
          current_period_end: string;
          current_period_start: string;
          custom_messages_per_period: number | null;
          ended_at: string | null;
          id: string;
          metadata: Json | null;
          price_id: string | null;
          quantity: number | null;
          status: Database["public"]["Enums"]["subscription_status"] | null;
          trial_end: string | null;
          trial_start: string | null;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          custom_messages_per_period?: number | null;
          ended_at?: string | null;
          id: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          custom_messages_per_period?: number | null;
          ended_at?: string | null;
          id?: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "prices";
            referencedColumns: ["id"];
          },
        ];
      };
      unsubscribe_surveys: {
        Row: {
          email: string | null;
          id: number;
          improvementsuggestion: string | null;
          mainreason: string | null;
          otherreason: string | null;
          submission_date: string | null;
        };
        Insert: {
          email?: string | null;
          id?: number;
          improvementsuggestion?: string | null;
          mainreason?: string | null;
          otherreason?: string | null;
          submission_date?: string | null;
        };
        Update: {
          email?: string | null;
          id?: number;
          improvementsuggestion?: string | null;
          mainreason?: string | null;
          otherreason?: string | null;
          submission_date?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          billing_address: Json | null;
          created_at: string | null;
          full_name: string | null;
          id: string;
          ip_address: string | null;
          payment_method: Json | null;
          stripe_account_id: string | null;
          stripe_account_status: string | null;
          stripe_charges_enabled: boolean | null;
          stripe_onboarding_completed: boolean | null;
          stripe_payouts_enabled: boolean | null;
        };
        Insert: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          created_at?: string | null;
          full_name?: string | null;
          id: string;
          ip_address?: string | null;
          payment_method?: Json | null;
          stripe_account_id?: string | null;
          stripe_account_status?: string | null;
          stripe_charges_enabled?: boolean | null;
          stripe_onboarding_completed?: boolean | null;
          stripe_payouts_enabled?: boolean | null;
        };
        Update: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          ip_address?: string | null;
          payment_method?: Json | null;
          stripe_account_id?: string | null;
          stripe_account_status?: string | null;
          stripe_charges_enabled?: boolean | null;
          stripe_onboarding_completed?: boolean | null;
          stripe_payouts_enabled?: boolean | null;
        };
        Relationships: [];
      };
      user_integrations: {
        Row: {
          config: Json;
          created_at: string;
          id: string;
          integration_type: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          config: Json;
          created_at?: string;
          id?: string;
          integration_type: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          id?: string;
          integration_type?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_integrations: {
        Row: {
          chat_id: string;
          config_override: Json | null;
          created_at: string;
          id: string;
          integration_id: string;
          is_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          chat_id: string;
          config_override?: Json | null;
          created_at?: string;
          id?: string;
          integration_id: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          chat_id?: string;
          config_override?: Json | null;
          created_at?: string;
          id?: string;
          integration_id?: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_integrations_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_integrations_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "user_integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_schemas: {
        Row: {
          chat_id: string;
          created_at: string;
          generated_files: Json;
          id: string;
          integration_id: string;
          schema_definition: Json;
          updated_at: string;
        };
        Insert: {
          chat_id: string;
          created_at?: string;
          generated_files: Json;
          id?: string;
          integration_id: string;
          schema_definition: Json;
          updated_at?: string;
        };
        Update: {
          chat_id?: string;
          created_at?: string;
          generated_files?: Json;
          id?: string;
          integration_id?: string;
          schema_definition?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_schemas_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_schemas_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "user_integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      version_usage_tracking: {
        Row: {
          chat_id: string;
          created_at: string | null;
          id: string;
          usage_type: string;
          user_id: string;
          version: number;
        };
        Insert: {
          chat_id: string;
          created_at?: string | null;
          id?: string;
          usage_type: string;
          user_id: string;
          version: number;
        };
        Update: {
          chat_id?: string;
          created_at?: string | null;
          id?: string;
          usage_type?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "version_usage_tracking_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      messages_view: {
        Row: {
          chat_id: string | null;
          content: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: number | null;
          input_tokens_column: number | null;
          is_built: boolean | null;
          output_tokens_column: number | null;
          prompt_image: string | null;
          role: string | null;
          screenshot: string | null;
          subscription_count: number | null;
          subscription_type: string | null;
          theme: string | null;
          version: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_client_credit: {
        Args: { amount_to_add: number; client_id_param: string };
        Returns: undefined;
      };
      calculate_available_earnings: {
        Args: { seller_uuid: string };
        Returns: number;
      };
      generate_api_key: { Args: never; Returns: string };
      get_all_components: {
        Args: never;
        Returns: {
          chat_id: string;
          created_at: string;
          first_user_message: string;
          framework: string;
          is_featured: boolean;
          is_private: boolean;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          slug: string;
          user_avatar_url: string;
          user_full_name: string;
          user_id: string;
        }[];
      };
      get_components: {
        Args: never;
        Returns: {
          chat_id: string;
          clone_url: string;
          created_at: string;
          first_user_message: string;
          framework: string;
          is_featured: boolean;
          is_private: boolean;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          likes: number;
          remix_chat_id: string;
          slug: string;
          title: string;
          user_avatar_url: string;
          user_full_name: string;
          user_id: string;
          views: number;
        }[];
      };
      get_components_with_theme_and_slug: {
        Args: never;
        Returns: {
          chat_id: string;
          created_at: string;
          first_user_message: string;
          is_featured: boolean;
          is_private: boolean;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          slug: string;
          user_avatar_url: string;
          user_full_name: string;
          user_id: string;
        }[];
      };
      get_components2: {
        Args: never;
        Returns: {
          chat_id: string;
          created_at: string;
          first_user_message: string;
          framework: string;
          is_featured: boolean;
          is_private: boolean;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          likes: number;
          remix_chat_id: string;
          slug: string;
          title: string;
          user_avatar_url: string;
          user_full_name: string;
          user_id: string;
        }[];
      };
      get_components3: {
        Args: never;
        Returns: {
          chat_id: string;
          created_at: string;
          first_user_message: string;
          framework: string;
          is_featured: boolean;
          is_private: boolean;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          likes: number;
          remix_chat_id: string;
          slug: string;
          title: string;
          user_avatar_url: string;
          user_full_name: string;
          user_id: string;
        }[];
      };
      get_components4: {
        Args: never;
        Returns: {
          chat_id: string;
          created_at: string;
          first_user_message: string;
          framework: string;
          is_featured: boolean;
          is_private: boolean;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          likes: number;
          remix_chat_id: string;
          slug: string;
          title: string;
          user_avatar_url: string;
          user_full_name: string;
          user_id: string;
          views: number;
        }[];
      };
      get_median_message_cost: {
        Args: never;
        Returns: {
          average_cost: string;
          median_cost: string;
          message_count: number;
          month: string;
          processing_engine: string;
        }[];
      };
      increment_listing_sales: {
        Args: { listing_id_param: string };
        Returns: undefined;
      };
      migrate_prompt_image_to_files: { Args: never; Returns: undefined };
      update_pending_earnings_to_available: { Args: never; Returns: number };
    };
    Enums: {
      pricing_plan_interval: "day" | "week" | "month" | "year";
      pricing_type: "one_time" | "recurring";
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      pricing_plan_interval: ["day", "week", "month", "year"],
      pricing_type: ["one_time", "recurring"],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
        "paused",
      ],
    },
  },
} as const;
