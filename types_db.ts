export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
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
          id: string;
          input_tokens: number | null;
          is_featured: boolean | null;
          is_private: boolean | null;
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
          id?: string;
          input_tokens?: number | null;
          is_featured?: boolean | null;
          is_private?: boolean | null;
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
          id?: string;
          input_tokens?: number | null;
          is_featured?: boolean | null;
          is_private?: boolean | null;
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
      environment_variables: {
        Row: {
          chat_id: string;
          created_at: string;
          id: number;
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          chat_id: string;
          created_at?: string;
          id?: number;
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          chat_id?: string;
          created_at?: string;
          id?: number;
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "environment_variables_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
        ];
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
      messages: {
        Row: {
          artifact_code: string | null;
          cache_creation_input_tokens: number | null;
          cache_read_input_tokens: number | null;
          chat_id: string;
          content: string;
          created_at: string;
          id: number;
          input_tokens: number | null;
          is_built: boolean | null;
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
          id?: number;
          input_tokens?: number | null;
          is_built?: boolean | null;
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
          id?: number;
          input_tokens?: number | null;
          is_built?: boolean | null;
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
          payment_id: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          amount?: number | null;
          amount_euro?: number | null;
          created?: string | null;
          description?: string | null;
          email?: string | null;
          payment_id: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          amount?: number | null;
          amount_euro?: number | null;
          created?: string | null;
          description?: string | null;
          email?: string | null;
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
        };
        Insert: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          created_at?: string | null;
          full_name?: string | null;
          id: string;
          ip_address?: string | null;
          payment_method?: Json | null;
        };
        Update: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          ip_address?: string | null;
          payment_method?: Json | null;
        };
        Relationships: [];
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
      get_all_components: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chat_id: string;
          user_id: string;
          user_full_name: string;
          user_avatar_url: string;
          is_featured: boolean;
          is_private: boolean;
          created_at: string;
          slug: string;
          first_user_message: string;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          framework: string;
        }[];
      };
      get_components: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chat_id: string;
          user_id: string;
          user_full_name: string;
          user_avatar_url: string;
          is_featured: boolean;
          is_private: boolean;
          created_at: string;
          slug: string;
          title: string;
          likes: number;
          first_user_message: string;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          framework: string;
          remix_chat_id: string;
          views: number;
          clone_url: string;
        }[];
      };
      get_components_with_theme_and_slug: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chat_id: string;
          user_id: string;
          user_full_name: string;
          user_avatar_url: string;
          is_featured: boolean;
          is_private: boolean;
          created_at: string;
          slug: string;
          first_user_message: string;
          last_assistant_message: string;
          last_assistant_message_theme: string;
        }[];
      };
      get_components2: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chat_id: string;
          user_id: string;
          user_full_name: string;
          user_avatar_url: string;
          is_featured: boolean;
          is_private: boolean;
          created_at: string;
          slug: string;
          title: string;
          likes: number;
          first_user_message: string;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          framework: string;
          remix_chat_id: string;
        }[];
      };
      get_components3: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chat_id: string;
          user_id: string;
          user_full_name: string;
          user_avatar_url: string;
          is_featured: boolean;
          is_private: boolean;
          created_at: string;
          slug: string;
          title: string;
          likes: number;
          first_user_message: string;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          framework: string;
          remix_chat_id: string;
        }[];
      };
      get_components4: {
        Args: Record<PropertyKey, never>;
        Returns: {
          chat_id: string;
          user_id: string;
          user_full_name: string;
          user_avatar_url: string;
          is_featured: boolean;
          is_private: boolean;
          created_at: string;
          slug: string;
          title: string;
          likes: number;
          first_user_message: string;
          last_assistant_message: string;
          last_assistant_message_theme: string;
          framework: string;
          remix_chat_id: string;
          views: number;
        }[];
      };
      get_median_message_cost: {
        Args: Record<PropertyKey, never>;
        Returns: {
          month: string;
          processing_engine: string;
          message_count: number;
          average_cost: string;
          median_cost: string;
        }[];
      };
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

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
