export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      custom_oauth_providers: {
        Row: {
          acceptable_client_ids: string[]
          attribute_mapping: Json
          authorization_params: Json
          authorization_url: string | null
          cached_discovery: Json | null
          client_id: string
          client_secret: string
          created_at: string
          discovery_cached_at: string | null
          discovery_url: string | null
          email_optional: boolean
          enabled: boolean
          id: string
          identifier: string
          issuer: string | null
          jwks_uri: string | null
          name: string
          pkce_enabled: boolean
          provider_type: string
          scopes: string[]
          skip_nonce_check: boolean
          token_url: string | null
          updated_at: string
          userinfo_url: string | null
        }
        Insert: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id: string
          client_secret: string
          created_at?: string
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier: string
          issuer?: string | null
          jwks_uri?: string | null
          name: string
          pkce_enabled?: boolean
          provider_type: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Update: {
          acceptable_client_ids?: string[]
          attribute_mapping?: Json
          authorization_params?: Json
          authorization_url?: string | null
          cached_discovery?: Json | null
          client_id?: string
          client_secret?: string
          created_at?: string
          discovery_cached_at?: string | null
          discovery_url?: string | null
          email_optional?: boolean
          enabled?: boolean
          id?: string
          identifier?: string
          issuer?: string | null
          jwks_uri?: string | null
          name?: string
          pkce_enabled?: boolean
          provider_type?: string
          scopes?: string[]
          skip_nonce_check?: boolean
          token_url?: string | null
          updated_at?: string
          userinfo_url?: string | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string | null
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string | null
          email_optional: boolean
          id: string
          invite_token: string | null
          linking_target_id: string | null
          oauth_client_state_id: string | null
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          referrer: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string | null
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string | null
          email_optional?: boolean
          id?: string
          invite_token?: string | null
          linking_target_id?: string | null
          oauth_client_state_id?: string | null
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          referrer?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          last_webauthn_challenge_data: Json | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          last_webauthn_challenge_data?: Json | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorizations: {
        Row: {
          approved_at: string | null
          authorization_code: string | null
          authorization_id: string
          client_id: string
          code_challenge: string | null
          code_challenge_method:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at: string
          expires_at: string
          id: string
          nonce: string | null
          redirect_uri: string
          resource: string | null
          response_type: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state: string | null
          status: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id: string
          client_id: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id: string
          nonce?: string | null
          redirect_uri: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          authorization_code?: string | null
          authorization_id?: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?:
            | Database["auth"]["Enums"]["code_challenge_method"]
            | null
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string | null
          redirect_uri?: string
          resource?: string | null
          response_type?: Database["auth"]["Enums"]["oauth_response_type"]
          scope?: string
          state?: string | null
          status?: Database["auth"]["Enums"]["oauth_authorization_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorizations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_client_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Insert: {
          code_verifier?: string | null
          created_at: string
          id: string
          provider_type: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          id?: string
          provider_type?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_name: string | null
          client_secret_hash: string | null
          client_type: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri: string | null
          created_at: string
          deleted_at: string | null
          grant_types: string
          id: string
          logo_uri: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types: string
          id: string
          logo_uri?: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          client_secret_hash?: string | null
          client_type?: Database["auth"]["Enums"]["oauth_client_type"]
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types?: string
          id?: string
          logo_uri?: string | null
          redirect_uris?: string
          registration_type?: Database["auth"]["Enums"]["oauth_registration_type"]
          token_endpoint_auth_method?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_consents: {
        Row: {
          client_id: string
          granted_at: string
          id: string
          revoked_at: string | null
          scopes: string
          user_id: string
        }
        Insert: {
          client_id: string
          granted_at?: string
          id: string
          revoked_at?: string | null
          scopes: string
          user_id: string
        }
        Update: {
          client_id?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          scopes?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_consents_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_consents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_tokens: {
        Row: {
          created_at: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown
          not_after: string | null
          oauth_client_id: string | null
          refresh_token_counter: number | null
          refresh_token_hmac_key: string | null
          refreshed_at: string | null
          scopes: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown
          not_after?: string | null
          oauth_client_id?: string | null
          refresh_token_counter?: number | null
          refresh_token_hmac_key?: string | null
          refreshed_at?: string | null
          scopes?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_oauth_client_id_fkey"
            columns: ["oauth_client_id"]
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          disabled: boolean | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          session_data: Json
          user_id: string | null
        }
        Insert: {
          challenge_type: string
          created_at?: string
          expires_at: string
          id?: string
          session_data: Json
          user_id?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_data?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_challenges_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          aaguid: string | null
          attestation_type: string
          backed_up: boolean
          backup_eligible: boolean
          created_at: string
          credential_id: string
          friendly_name: string
          id: string
          last_used_at: string | null
          public_key: string
          sign_count: number
          transports: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          aaguid?: string | null
          attestation_type?: string
          backed_up?: boolean
          backup_eligible?: boolean
          created_at?: string
          credential_id?: string
          friendly_name?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          sign_count?: number
          transports?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_credentials_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: { Args: never; Returns: string }
      jwt: { Args: never; Returns: Json }
      role: { Args: never; Returns: string }
      uid: { Args: never; Returns: string }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone"
      oauth_authorization_status: "pending" | "approved" | "denied" | "expired"
      oauth_client_type: "public" | "confidential"
      oauth_registration_type: "dynamic" | "manual"
      oauth_response_type: "code"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  coderocket: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_profiles_for_admin: {
        Args: { admin_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }[]
      }
      make_first_user_admin: { Args: never; Returns: undefined }
      update_user_role: {
        Args: {
          admin_user_id: string
          new_role: string
          target_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  extensions: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      pg_stat_statements: {
        Row: {
          blk_read_time: number | null
          blk_write_time: number | null
          calls: number | null
          dbid: unknown
          jit_emission_count: number | null
          jit_emission_time: number | null
          jit_functions: number | null
          jit_generation_time: number | null
          jit_inlining_count: number | null
          jit_inlining_time: number | null
          jit_optimization_count: number | null
          jit_optimization_time: number | null
          local_blks_dirtied: number | null
          local_blks_hit: number | null
          local_blks_read: number | null
          local_blks_written: number | null
          max_exec_time: number | null
          max_plan_time: number | null
          mean_exec_time: number | null
          mean_plan_time: number | null
          min_exec_time: number | null
          min_plan_time: number | null
          plans: number | null
          query: string | null
          queryid: number | null
          rows: number | null
          shared_blks_dirtied: number | null
          shared_blks_hit: number | null
          shared_blks_read: number | null
          shared_blks_written: number | null
          stddev_exec_time: number | null
          stddev_plan_time: number | null
          temp_blk_read_time: number | null
          temp_blk_write_time: number | null
          temp_blks_read: number | null
          temp_blks_written: number | null
          toplevel: boolean | null
          total_exec_time: number | null
          total_plan_time: number | null
          userid: unknown
          wal_bytes: number | null
          wal_fpi: number | null
          wal_records: number | null
        }
        Relationships: []
      }
      pg_stat_statements_info: {
        Row: {
          dealloc: number | null
          stats_reset: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      algorithm_sign: {
        Args: { algorithm: string; secret: string; signables: string }
        Returns: string
      }
      dearmor: { Args: { "": string }; Returns: string }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      pg_stat_statements: {
        Args: { showtext: boolean }
        Returns: Record<string, unknown>[]
      }
      pg_stat_statements_info: { Args: never; Returns: Record<string, unknown> }
      pg_stat_statements_reset: {
        Args: { dbid?: unknown; queryid?: number; userid?: unknown }
        Returns: undefined
      }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      sign: {
        Args: { algorithm?: string; payload: Json; secret: string }
        Returns: string
      }
      try_cast_double: { Args: { inp: string }; Returns: number }
      url_decode: { Args: { data: string }; Returns: string }
      url_encode: { Args: { data: string }; Returns: string }
      uuid_generate_v1: { Args: never; Returns: string }
      uuid_generate_v1mc: { Args: never; Returns: string }
      uuid_generate_v3: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_generate_v4: { Args: never; Returns: string }
      uuid_generate_v5: {
        Args: { name: string; namespace: string }
        Returns: string
      }
      uuid_nil: { Args: never; Returns: string }
      uuid_ns_dns: { Args: never; Returns: string }
      uuid_ns_oid: { Args: never; Returns: string }
      uuid_ns_url: { Args: never; Returns: string }
      uuid_ns_x500: { Args: never; Returns: string }
      verify: {
        Args: { algorithm?: string; secret: string; token: string }
        Returns: {
          header: Json
          payload: Json
          valid: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  net: {
    Tables: {
      _http_response: {
        Row: {
          content: string | null
          content_type: string | null
          created: string
          error_msg: string | null
          headers: Json | null
          id: number | null
          status_code: number | null
          timed_out: boolean | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created?: string
          error_msg?: string | null
          headers?: Json | null
          id?: number | null
          status_code?: number | null
          timed_out?: boolean | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created?: string
          error_msg?: string | null
          headers?: Json | null
          id?: number | null
          status_code?: number | null
          timed_out?: boolean | null
        }
        Relationships: []
      }
      http_request_queue: {
        Row: {
          body: string | null
          headers: Json
          id: number
          method: string
          timeout_milliseconds: number
          url: string
        }
        Insert: {
          body?: string | null
          headers: Json
          id?: number
          method: string
          timeout_milliseconds: number
          url: string
        }
        Update: {
          body?: string | null
          headers?: Json
          id?: number
          method?: string
          timeout_milliseconds?: number
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _await_response: { Args: { request_id: number }; Returns: boolean }
      _encode_url_with_params_array: {
        Args: { params_array: string[]; url: string }
        Returns: string
      }
      _http_collect_response: {
        Args: { async?: boolean; request_id: number }
        Returns: Database["net"]["CompositeTypes"]["http_response_result"]
        SetofOptions: {
          from: "*"
          to: "http_response_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _urlencode_string: { Args: { string: string }; Returns: string }
      check_worker_is_up: { Args: never; Returns: undefined }
      http_collect_response: {
        Args: { async?: boolean; request_id: number }
        Returns: Database["net"]["CompositeTypes"]["http_response_result"]
        SetofOptions: {
          from: "*"
          to: "http_response_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete: {
        Args: {
          headers?: Json
          params?: Json
          timeout_milliseconds?: number
          url: string
        }
        Returns: number
      }
      http_get: {
        Args: {
          headers?: Json
          params?: Json
          timeout_milliseconds?: number
          url: string
        }
        Returns: number
      }
      http_post: {
        Args: {
          body?: Json
          headers?: Json
          params?: Json
          timeout_milliseconds?: number
          url: string
        }
        Returns: number
      }
    }
    Enums: {
      request_status: "PENDING" | "SUCCESS" | "ERROR"
    }
    CompositeTypes: {
      http_response: {
        status_code: number | null
        headers: Json | null
        body: string | null
      }
      http_response_result: {
        status: Database["net"]["Enums"]["request_status"] | null
        message: string | null
        response: Database["net"]["CompositeTypes"]["http_response"] | null
      }
    }
  }
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: { p_usename: string }
        Returns: {
          password: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  pgsodium: {
    Tables: {
      key: {
        Row: {
          associated_data: string | null
          comment: string | null
          created: string
          expires: string | null
          id: string
          key_context: string | null
          key_id: number | null
          key_type: Database["pgsodium"]["Enums"]["key_type"] | null
          name: string | null
          parent_key: string | null
          raw_key: string | null
          raw_key_nonce: string | null
          status: Database["pgsodium"]["Enums"]["key_status"] | null
          user_data: string | null
        }
        Insert: {
          associated_data?: string | null
          comment?: string | null
          created?: string
          expires?: string | null
          id?: string
          key_context?: string | null
          key_id?: number | null
          key_type?: Database["pgsodium"]["Enums"]["key_type"] | null
          name?: string | null
          parent_key?: string | null
          raw_key?: string | null
          raw_key_nonce?: string | null
          status?: Database["pgsodium"]["Enums"]["key_status"] | null
          user_data?: string | null
        }
        Update: {
          associated_data?: string | null
          comment?: string | null
          created?: string
          expires?: string | null
          id?: string
          key_context?: string | null
          key_id?: number | null
          key_type?: Database["pgsodium"]["Enums"]["key_type"] | null
          name?: string | null
          parent_key?: string | null
          raw_key?: string | null
          raw_key_nonce?: string | null
          status?: Database["pgsodium"]["Enums"]["key_status"] | null
          user_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_parent_key_fkey"
            columns: ["parent_key"]
            referencedRelation: "decrypted_key"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_parent_key_fkey"
            columns: ["parent_key"]
            referencedRelation: "key"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_parent_key_fkey"
            columns: ["parent_key"]
            referencedRelation: "valid_key"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      decrypted_key: {
        Row: {
          associated_data: string | null
          comment: string | null
          created: string | null
          decrypted_raw_key: string | null
          expires: string | null
          id: string | null
          key_context: string | null
          key_id: number | null
          key_type: Database["pgsodium"]["Enums"]["key_type"] | null
          name: string | null
          parent_key: string | null
          raw_key: string | null
          raw_key_nonce: string | null
          status: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        Insert: {
          associated_data?: string | null
          comment?: string | null
          created?: string | null
          decrypted_raw_key?: never
          expires?: string | null
          id?: string | null
          key_context?: string | null
          key_id?: number | null
          key_type?: Database["pgsodium"]["Enums"]["key_type"] | null
          name?: string | null
          parent_key?: string | null
          raw_key?: string | null
          raw_key_nonce?: string | null
          status?: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        Update: {
          associated_data?: string | null
          comment?: string | null
          created?: string | null
          decrypted_raw_key?: never
          expires?: string | null
          id?: string | null
          key_context?: string | null
          key_id?: number | null
          key_type?: Database["pgsodium"]["Enums"]["key_type"] | null
          name?: string | null
          parent_key?: string | null
          raw_key?: string | null
          raw_key_nonce?: string | null
          status?: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "key_parent_key_fkey"
            columns: ["parent_key"]
            referencedRelation: "decrypted_key"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_parent_key_fkey"
            columns: ["parent_key"]
            referencedRelation: "key"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_parent_key_fkey"
            columns: ["parent_key"]
            referencedRelation: "valid_key"
            referencedColumns: ["id"]
          },
        ]
      }
      mask_columns: {
        Row: {
          associated_columns: string | null
          attname: unknown
          attrelid: unknown
          format_type: string | null
          key_id: string | null
          key_id_column: string | null
          nonce_column: string | null
        }
        Relationships: []
      }
      masking_rule: {
        Row: {
          associated_columns: string | null
          attname: unknown
          attnum: number | null
          attrelid: unknown
          col_description: string | null
          format_type: string | null
          key_id: string | null
          key_id_column: string | null
          nonce_column: string | null
          priority: number | null
          relname: unknown
          relnamespace: unknown
          security_invoker: boolean | null
          view_name: string | null
        }
        Relationships: []
      }
      valid_key: {
        Row: {
          associated_data: string | null
          created: string | null
          expires: string | null
          id: string | null
          key_context: string | null
          key_id: number | null
          key_type: Database["pgsodium"]["Enums"]["key_type"] | null
          name: string | null
          status: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        Insert: {
          associated_data?: string | null
          created?: string | null
          expires?: string | null
          id?: string | null
          key_context?: string | null
          key_id?: number | null
          key_type?: Database["pgsodium"]["Enums"]["key_type"] | null
          name?: string | null
          status?: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        Update: {
          associated_data?: string | null
          created?: string | null
          expires?: string | null
          id?: string | null
          key_context?: string | null
          key_id?: number | null
          key_type?: Database["pgsodium"]["Enums"]["key_type"] | null
          name?: string | null
          status?: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_key: {
        Args: {
          associated_data?: string
          expires?: string
          key_context?: string
          key_type?: Database["pgsodium"]["Enums"]["key_type"]
          name?: string
          parent_key?: string
          raw_key?: string
          raw_key_nonce?: string
        }
        Returns: {
          associated_data: string | null
          created: string | null
          expires: string | null
          id: string | null
          key_context: string | null
          key_id: number | null
          key_type: Database["pgsodium"]["Enums"]["key_type"] | null
          name: string | null
          status: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        SetofOptions: {
          from: "*"
          to: "valid_key"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_mask_view:
        | { Args: { debug?: boolean; relid: unknown }; Returns: undefined }
        | {
            Args: { debug?: boolean; relid: unknown; subid: number }
            Returns: undefined
          }
      crypto_aead_det_decrypt:
        | {
            Args: {
              additional: string
              ciphertext: string
              key: string
              nonce?: string
            }
            Returns: string
          }
        | {
            Args: {
              additional: string
              context?: string
              key_id: number
              message: string
              nonce?: string
            }
            Returns: string
          }
        | {
            Args: { additional: string; key_uuid: string; message: string }
            Returns: string
          }
        | {
            Args: {
              additional: string
              key_uuid: string
              message: string
              nonce: string
            }
            Returns: string
          }
      crypto_aead_det_encrypt:
        | {
            Args: {
              additional: string
              key: string
              message: string
              nonce?: string
            }
            Returns: string
          }
        | {
            Args: {
              additional: string
              context?: string
              key_id: number
              message: string
              nonce?: string
            }
            Returns: string
          }
        | {
            Args: { additional: string; key_uuid: string; message: string }
            Returns: string
          }
        | {
            Args: {
              additional: string
              key_uuid: string
              message: string
              nonce: string
            }
            Returns: string
          }
      crypto_aead_det_keygen: { Args: never; Returns: string }
      crypto_aead_det_noncegen: { Args: never; Returns: string }
      crypto_aead_ietf_decrypt:
        | {
            Args: {
              additional: string
              key: string
              message: string
              nonce: string
            }
            Returns: string
          }
        | {
            Args: {
              additional: string
              context?: string
              key_id: number
              message: string
              nonce: string
            }
            Returns: string
          }
        | {
            Args: {
              additional: string
              key_uuid: string
              message: string
              nonce: string
            }
            Returns: string
          }
      crypto_aead_ietf_encrypt:
        | {
            Args: {
              additional: string
              key: string
              message: string
              nonce: string
            }
            Returns: string
          }
        | {
            Args: {
              additional: string
              context?: string
              key_id: number
              message: string
              nonce: string
            }
            Returns: string
          }
        | {
            Args: {
              additional: string
              key_uuid: string
              message: string
              nonce: string
            }
            Returns: string
          }
      crypto_aead_ietf_keygen: { Args: never; Returns: string }
      crypto_aead_ietf_noncegen: { Args: never; Returns: string }
      crypto_auth:
        | { Args: { key: string; message: string }; Returns: string }
        | {
            Args: { context?: string; key_id: number; message: string }
            Returns: string
          }
        | { Args: { key_uuid: string; message: string }; Returns: string }
      crypto_auth_hmacsha256:
        | {
            Args: { context?: string; key_id: number; message: string }
            Returns: string
          }
        | { Args: { key_uuid: string; message: string }; Returns: string }
        | { Args: { message: string; secret: string }; Returns: string }
      crypto_auth_hmacsha256_keygen: { Args: never; Returns: string }
      crypto_auth_hmacsha256_verify:
        | {
            Args: {
              context?: string
              hash: string
              key_id: number
              message: string
            }
            Returns: boolean
          }
        | {
            Args: { hash: string; message: string; secret: string }
            Returns: boolean
          }
        | {
            Args: { key_uuid: string; message: string; signature: string }
            Returns: boolean
          }
      crypto_auth_hmacsha512:
        | {
            Args: { context?: string; key_id: number; message: string }
            Returns: string
          }
        | { Args: { key_uuid: string; message: string }; Returns: string }
        | { Args: { message: string; secret: string }; Returns: string }
      crypto_auth_hmacsha512_keygen: { Args: never; Returns: string }
      crypto_auth_hmacsha512_verify:
        | {
            Args: {
              context?: string
              hash: string
              key_id: number
              message: string
            }
            Returns: boolean
          }
        | {
            Args: { hash: string; message: string; secret: string }
            Returns: boolean
          }
        | {
            Args: { key_uuid: string; message: string; signature: string }
            Returns: boolean
          }
      crypto_auth_keygen: { Args: never; Returns: string }
      crypto_auth_verify:
        | {
            Args: { key: string; mac: string; message: string }
            Returns: boolean
          }
        | {
            Args: {
              context?: string
              key_id: number
              mac: string
              message: string
            }
            Returns: boolean
          }
        | {
            Args: { key_uuid: string; mac: string; message: string }
            Returns: boolean
          }
      crypto_box: {
        Args: { message: string; nonce: string; public: string; secret: string }
        Returns: string
      }
      crypto_box_new_keypair: {
        Args: never
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_box_keypair"]
        SetofOptions: {
          from: "*"
          to: "crypto_box_keypair"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_box_new_seed: { Args: never; Returns: string }
      crypto_box_noncegen: { Args: never; Returns: string }
      crypto_box_open: {
        Args: {
          ciphertext: string
          nonce: string
          public: string
          secret: string
        }
        Returns: string
      }
      crypto_box_seal: {
        Args: { message: string; public_key: string }
        Returns: string
      }
      crypto_box_seal_open: {
        Args: { ciphertext: string; public_key: string; secret_key: string }
        Returns: string
      }
      crypto_box_seed_new_keypair: {
        Args: { seed: string }
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_box_keypair"]
        SetofOptions: {
          from: "*"
          to: "crypto_box_keypair"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_generichash:
        | {
            Args: { context?: string; key: number; message: string }
            Returns: string
          }
        | { Args: { key?: string; message: string }; Returns: string }
        | { Args: { key_uuid: string; message: string }; Returns: string }
      crypto_generichash_keygen: { Args: never; Returns: string }
      crypto_hash_sha256: { Args: { message: string }; Returns: string }
      crypto_hash_sha512: { Args: { message: string }; Returns: string }
      crypto_kdf_derive_from_key:
        | {
            Args: {
              context: string
              primary_key: string
              subkey_id: number
              subkey_size: number
            }
            Returns: string
          }
        | {
            Args: {
              context: string
              primary_key: string
              subkey_id: number
              subkey_size: number
            }
            Returns: string
          }
      crypto_kdf_keygen: { Args: never; Returns: string }
      crypto_kx_client_session_keys: {
        Args: { client_pk: string; client_sk: string; server_pk: string }
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_kx_session"]
        SetofOptions: {
          from: "*"
          to: "crypto_kx_session"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_kx_new_keypair: {
        Args: never
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_kx_keypair"]
        SetofOptions: {
          from: "*"
          to: "crypto_kx_keypair"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_kx_new_seed: { Args: never; Returns: string }
      crypto_kx_seed_new_keypair: {
        Args: { seed: string }
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_kx_keypair"]
        SetofOptions: {
          from: "*"
          to: "crypto_kx_keypair"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_kx_server_session_keys: {
        Args: { client_pk: string; server_pk: string; server_sk: string }
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_kx_session"]
        SetofOptions: {
          from: "*"
          to: "crypto_kx_session"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_pwhash: {
        Args: { password: string; salt: string }
        Returns: string
      }
      crypto_pwhash_saltgen: { Args: never; Returns: string }
      crypto_pwhash_str: { Args: { password: string }; Returns: string }
      crypto_pwhash_str_verify: {
        Args: { hashed_password: string; password: string }
        Returns: boolean
      }
      crypto_secretbox:
        | {
            Args: { key: string; message: string; nonce: string }
            Returns: string
          }
        | {
            Args: {
              context?: string
              key_id: number
              message: string
              nonce: string
            }
            Returns: string
          }
        | {
            Args: { key_uuid: string; message: string; nonce: string }
            Returns: string
          }
      crypto_secretbox_keygen: { Args: never; Returns: string }
      crypto_secretbox_noncegen: { Args: never; Returns: string }
      crypto_secretbox_open:
        | {
            Args: { ciphertext: string; key: string; nonce: string }
            Returns: string
          }
        | {
            Args: {
              context?: string
              key_id: number
              message: string
              nonce: string
            }
            Returns: string
          }
        | {
            Args: { key_uuid: string; message: string; nonce: string }
            Returns: string
          }
      crypto_secretstream_keygen: { Args: never; Returns: string }
      crypto_shorthash:
        | {
            Args: { context?: string; key: number; message: string }
            Returns: string
          }
        | { Args: { key: string; message: string }; Returns: string }
        | { Args: { key_uuid: string; message: string }; Returns: string }
      crypto_shorthash_keygen: { Args: never; Returns: string }
      crypto_sign: { Args: { key: string; message: string }; Returns: string }
      crypto_sign_detached: {
        Args: { key: string; message: string }
        Returns: string
      }
      crypto_sign_final_create: {
        Args: { key: string; state: string }
        Returns: string
      }
      crypto_sign_final_verify: {
        Args: { key: string; signature: string; state: string }
        Returns: boolean
      }
      crypto_sign_init: { Args: never; Returns: string }
      crypto_sign_new_keypair: {
        Args: never
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_sign_keypair"]
        SetofOptions: {
          from: "*"
          to: "crypto_sign_keypair"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_sign_new_seed: { Args: never; Returns: string }
      crypto_sign_open: {
        Args: { key: string; signed_message: string }
        Returns: string
      }
      crypto_sign_seed_new_keypair: {
        Args: { seed: string }
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_sign_keypair"]
        SetofOptions: {
          from: "*"
          to: "crypto_sign_keypair"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_sign_update: {
        Args: { message: string; state: string }
        Returns: string
      }
      crypto_sign_update_agg1: {
        Args: { message: string; state: string }
        Returns: string
      }
      crypto_sign_update_agg2: {
        Args: { cur_state: string; initial_state: string; message: string }
        Returns: string
      }
      crypto_sign_verify_detached: {
        Args: { key: string; message: string; sig: string }
        Returns: boolean
      }
      crypto_signcrypt_new_keypair: {
        Args: never
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_signcrypt_keypair"]
        SetofOptions: {
          from: "*"
          to: "crypto_signcrypt_keypair"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_signcrypt_sign_after: {
        Args: { ciphertext: string; sender_sk: string; state: string }
        Returns: string
      }
      crypto_signcrypt_sign_before: {
        Args: {
          additional: string
          recipient: string
          recipient_pk: string
          sender: string
          sender_sk: string
        }
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_signcrypt_state_key"]
        SetofOptions: {
          from: "*"
          to: "crypto_signcrypt_state_key"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_signcrypt_verify_after: {
        Args: {
          ciphertext: string
          sender_pk: string
          signature: string
          state: string
        }
        Returns: boolean
      }
      crypto_signcrypt_verify_before: {
        Args: {
          additional: string
          recipient: string
          recipient_sk: string
          sender: string
          sender_pk: string
          signature: string
        }
        Returns: Database["pgsodium"]["CompositeTypes"]["crypto_signcrypt_state_key"]
        SetofOptions: {
          from: "*"
          to: "crypto_signcrypt_state_key"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crypto_signcrypt_verify_public: {
        Args: {
          additional: string
          ciphertext: string
          recipient: string
          sender: string
          sender_pk: string
          signature: string
        }
        Returns: boolean
      }
      crypto_stream_xchacha20_keygen: { Args: never; Returns: string }
      crypto_stream_xchacha20_noncegen: { Args: never; Returns: string }
      decrypted_columns: { Args: { relid: unknown }; Returns: string }
      derive_key: {
        Args: { context?: string; key_id: number; key_len?: number }
        Returns: string
      }
      disable_security_label_trigger: { Args: never; Returns: undefined }
      enable_security_label_trigger: { Args: never; Returns: undefined }
      encrypted_column: {
        Args: { m: Record<string, unknown>; relid: unknown }
        Returns: string
      }
      encrypted_columns: { Args: { relid: unknown }; Returns: string }
      get_key_by_name: {
        Args: { "": string }
        Returns: {
          associated_data: string | null
          created: string | null
          expires: string | null
          id: string | null
          key_context: string | null
          key_id: number | null
          key_type: Database["pgsodium"]["Enums"]["key_type"] | null
          name: string | null
          status: Database["pgsodium"]["Enums"]["key_status"] | null
        }
        SetofOptions: {
          from: "*"
          to: "valid_key"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_named_keys: {
        Args: { filter?: string }
        Returns: {
          associated_data: string | null
          created: string | null
          expires: string | null
          id: string | null
          key_context: string | null
          key_id: number | null
          key_type: Database["pgsodium"]["Enums"]["key_type"] | null
          name: string | null
          status: Database["pgsodium"]["Enums"]["key_status"] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "valid_key"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_mask: {
        Args: { role: unknown; source_name: string }
        Returns: boolean
      }
      mask_columns: {
        Args: { source_relid: unknown }
        Returns: {
          associated_column: string
          attname: unknown
          format_type: string
          key_id: string
          key_id_column: string
          nonce_column: string
        }[]
      }
      mask_role: {
        Args: { masked_role: unknown; source_name: string; view_name: string }
        Returns: undefined
      }
      pgsodium_derive: {
        Args: { context?: string; key_id: number; key_len?: number }
        Returns: string
      }
      randombytes_buf: { Args: { size: number }; Returns: string }
      randombytes_buf_deterministic: {
        Args: { seed: string; size: number }
        Returns: string
      }
      randombytes_new_seed: { Args: never; Returns: string }
      randombytes_random: { Args: never; Returns: number }
      randombytes_uniform: { Args: { upper_bound: number }; Returns: number }
      sodium_base642bin: { Args: { base64: string }; Returns: string }
      sodium_bin2base64: { Args: { bin: string }; Returns: string }
      update_mask: {
        Args: { debug?: boolean; target: unknown }
        Returns: undefined
      }
      update_masks: { Args: { debug?: boolean }; Returns: undefined }
      version: { Args: never; Returns: string }
    }
    Enums: {
      key_status: "default" | "valid" | "invalid" | "expired"
      key_type:
        | "aead-ietf"
        | "aead-det"
        | "hmacsha512"
        | "hmacsha256"
        | "auth"
        | "shorthash"
        | "generichash"
        | "kdf"
        | "secretbox"
        | "secretstream"
        | "stream_xchacha20"
    }
    CompositeTypes: {
      _key_id_context: {
        key_id: number | null
        key_context: string | null
      }
      crypto_box_keypair: {
        public: string | null
        secret: string | null
      }
      crypto_kx_keypair: {
        public: string | null
        secret: string | null
      }
      crypto_kx_session: {
        rx: string | null
        tx: string | null
      }
      crypto_sign_keypair: {
        public: string | null
        secret: string | null
      }
      crypto_signcrypt_keypair: {
        public: string | null
        secret: string | null
      }
      crypto_signcrypt_state_key: {
        state: string | null
        shared_key: string | null
      }
    }
  }
  pgsodium_masks: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chat_integrations: {
        Row: {
          chat_id: string
          config_override: Json | null
          created_at: string
          id: string
          integration_id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          chat_id: string
          config_override?: Json | null
          created_at?: string
          id?: string
          integration_id: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          chat_id?: string
          config_override?: Json | null
          created_at?: string
          id?: string
          integration_id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_integrations_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_integrations_integration_id_fkey"
            columns: ["integration_id"]
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_likes: {
        Row: {
          chat_id: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_likes_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_secrets: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_enabled: boolean
          secret_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          secret_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_secrets_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_secrets_secret_id_fkey"
            columns: ["secret_id"]
            referencedRelation: "user_secrets"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          active_stream_id: string | null
          active_stream_started_at: string | null
          artifact_code: string | null
          auto_deploy: boolean | null
          clone_url: string | null
          created_at: string | null
          deploy_subdomain: string | null
          deployed_at: string | null
          deployed_version: number | null
          framework: string | null
          github_repo_name: string | null
          github_repo_url: string | null
          id: string
          input_tokens: number | null
          is_deployed: boolean | null
          is_featured: boolean | null
          is_private: boolean | null
          last_github_commit_sha: string | null
          last_github_sync: string | null
          likes: number | null
          metadata: Json | null
          output_tokens: number | null
          prompt_image: string | null
          remix_chat_id: string | null
          remix_from_version: number | null
          slug: string | null
          title: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          active_stream_id?: string | null
          active_stream_started_at?: string | null
          artifact_code?: string | null
          auto_deploy?: boolean | null
          clone_url?: string | null
          created_at?: string | null
          deploy_subdomain?: string | null
          deployed_at?: string | null
          deployed_version?: number | null
          framework?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          input_tokens?: number | null
          is_deployed?: boolean | null
          is_featured?: boolean | null
          is_private?: boolean | null
          last_github_commit_sha?: string | null
          last_github_sync?: string | null
          likes?: number | null
          metadata?: Json | null
          output_tokens?: number | null
          prompt_image?: string | null
          remix_chat_id?: string | null
          remix_from_version?: number | null
          slug?: string | null
          title?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          active_stream_id?: string | null
          active_stream_started_at?: string | null
          artifact_code?: string | null
          auto_deploy?: boolean | null
          clone_url?: string | null
          created_at?: string | null
          deploy_subdomain?: string | null
          deployed_at?: string | null
          deployed_version?: number | null
          framework?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          input_tokens?: number | null
          is_deployed?: boolean | null
          is_featured?: boolean | null
          is_private?: boolean | null
          last_github_commit_sha?: string | null
          last_github_sync?: string | null
          likes?: number | null
          metadata?: Json | null
          output_tokens?: number | null
          prompt_image?: string | null
          remix_chat_id?: string | null
          remix_from_version?: number | null
          slug?: string | null
          title?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_remix_chat_id_fkey"
            columns: ["remix_chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          chat_id: string
          created_at: string
          domain: string
          id: string
          is_verified: boolean | null
          ssl_certificate_id: string | null
          ssl_expires_at: string | null
          ssl_issued_at: string | null
          ssl_status: string | null
          updated_at: string
          user_id: string
          verification_method: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          domain: string
          id?: string
          is_verified?: boolean | null
          ssl_certificate_id?: string | null
          ssl_expires_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: string | null
          updated_at?: string
          user_id: string
          verification_method?: string
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          domain?: string
          id?: string
          is_verified?: boolean | null
          ssl_certificate_id?: string | null
          ssl_expires_at?: string | null
          ssl_issued_at?: string | null
          ssl_status?: string | null
          updated_at?: string
          user_id?: string
          verification_method?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      email_jobs: {
        Row: {
          attempts: number
          created_at: string
          email: string
          id: string
          last_error: string | null
          payload: Json | null
          scenario: string
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          scenario: string
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          scenario?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      extra_messages: {
        Row: {
          count: number
          created_at: string
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_locks: {
        Row: {
          chat_id: string
          created_at: string
          lock_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          lock_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          lock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_locks_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      github_connections: {
        Row: {
          access_token: string | null
          connected_at: string
          github_username: string
          id: number
          last_sync_at: string | null
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          github_username: string
          id?: number
          last_sync_at?: string | null
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          github_username?: string
          id?: number
          last_sync_at?: string | null
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          artifact_code: string | null
          build_error: Json | null
          cache_creation_input_tokens: number | null
          cache_read_input_tokens: number | null
          chat_id: string
          clone_another_page: string | null
          content: string
          cost_usd: number | null
          created_at: string
          files: Json | null
          id: number
          input_tokens: number | null
          is_building: boolean | null
          is_built: boolean | null
          is_github_pull: boolean | null
          is_streaming: boolean | null
          migration_executed_at: string | null
          migrations_executed: Json | null
          model_used: string | null
          output_tokens: number | null
          prompt_image: string | null
          role: string
          screenshot: string | null
          selected_element: Json | null
          subscription_type: string | null
          theme: string | null
          version: number
        }
        Insert: {
          artifact_code?: string | null
          build_error?: Json | null
          cache_creation_input_tokens?: number | null
          cache_read_input_tokens?: number | null
          chat_id: string
          clone_another_page?: string | null
          content: string
          cost_usd?: number | null
          created_at?: string
          files?: Json | null
          id?: number
          input_tokens?: number | null
          is_building?: boolean | null
          is_built?: boolean | null
          is_github_pull?: boolean | null
          is_streaming?: boolean | null
          migration_executed_at?: string | null
          migrations_executed?: Json | null
          model_used?: string | null
          output_tokens?: number | null
          prompt_image?: string | null
          role: string
          screenshot?: string | null
          selected_element?: Json | null
          subscription_type?: string | null
          theme?: string | null
          version: number
        }
        Update: {
          artifact_code?: string | null
          build_error?: Json | null
          cache_creation_input_tokens?: number | null
          cache_read_input_tokens?: number | null
          chat_id?: string
          clone_another_page?: string | null
          content?: string
          cost_usd?: number | null
          created_at?: string
          files?: Json | null
          id?: number
          input_tokens?: number | null
          is_building?: boolean | null
          is_built?: boolean | null
          is_github_pull?: boolean | null
          is_streaming?: boolean | null
          migration_executed_at?: string | null
          migrations_executed?: Json | null
          model_used?: string | null
          output_tokens?: number | null
          prompt_image?: string | null
          role?: string
          screenshot?: string | null
          selected_element?: Json | null
          subscription_type?: string | null
          theme?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          button_label: string | null
          button_link: string | null
          created_at: string
          description: string
          id: number
          is_active: boolean
          title: string
        }
        Insert: {
          button_label?: string | null
          button_link?: string | null
          created_at?: string
          description: string
          id?: number
          is_active: boolean
          title: string
        }
        Update: {
          button_label?: string | null
          button_link?: string | null
          created_at?: string
          description?: string
          id?: number
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          amount_euro: number | null
          created: string | null
          description: string | null
          email: string | null
          payment_currency: string | null
          payment_id: string
          stripe_customer_id: string | null
        }
        Insert: {
          amount?: number | null
          amount_euro?: number | null
          created?: string | null
          description?: string | null
          email?: string | null
          payment_currency?: string | null
          payment_id: string
          stripe_customer_id?: string | null
        }
        Update: {
          amount?: number | null
          amount_euro?: number | null
          created?: string | null
          description?: string | null
          email?: string | null
          payment_currency?: string | null
          payment_id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          custom_messages_per_period: number | null
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          custom_messages_per_period?: number | null
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          custom_messages_per_period?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage_tracking: {
        Row: {
          cache_creation_input_tokens: number
          cache_read_input_tokens: number
          chat_id: string
          cost_usd: number
          created_at: string | null
          id: string
          input_tokens: number
          message_id: number | null
          model_used: string
          output_tokens: number
          usage_type: string
          user_id: string
        }
        Insert: {
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          chat_id: string
          cost_usd?: number
          created_at?: string | null
          id?: string
          input_tokens?: number
          message_id?: number | null
          model_used: string
          output_tokens?: number
          usage_type: string
          user_id: string
        }
        Update: {
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
          chat_id?: string
          cost_usd?: number
          created_at?: string | null
          id?: string
          input_tokens?: number
          message_id?: number | null
          model_used?: string
          output_tokens?: number
          usage_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_tracking_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_tracking_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_tracking_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages_view"
            referencedColumns: ["id"]
          },
        ]
      }
      unsubscribe_surveys: {
        Row: {
          email: string | null
          id: number
          improvementsuggestion: string | null
          mainreason: string | null
          otherreason: string | null
          submission_date: string | null
        }
        Insert: {
          email?: string | null
          id?: number
          improvementsuggestion?: string | null
          mainreason?: string | null
          otherreason?: string | null
          submission_date?: string | null
        }
        Update: {
          email?: string | null
          id?: number
          improvementsuggestion?: string | null
          mainreason?: string | null
          otherreason?: string | null
          submission_date?: string | null
        }
        Relationships: []
      }
      user_files: {
        Row: {
          created_at: string
          file_size: number
          file_type: string
          id: string
          mime_type: string
          original_name: string | null
          public_url: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number
          file_type: string
          id?: string
          mime_type: string
          original_name?: string | null
          public_url: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string
          original_name?: string | null
          public_url?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          integration_type: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          integration_type: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          integration_type?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_secrets: {
        Row: {
          api_domain: string | null
          created_at: string
          description: string | null
          encrypted_value: string
          header_name: string | null
          id: string
          injection_method: string | null
          key: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_domain?: string | null
          created_at?: string
          description?: string | null
          encrypted_value: string
          header_name?: string | null
          id?: string
          injection_method?: string | null
          key: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_domain?: string | null
          created_at?: string
          description?: string | null
          encrypted_value?: string
          header_name?: string | null
          id?: string
          injection_method?: string | null
          key?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          ip_address: string | null
          last_email_scenario: string | null
          last_email_sent_at: string | null
          payment_method: Json | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          stripe_charges_enabled: boolean | null
          stripe_onboarding_completed: boolean | null
          stripe_payouts_enabled: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          ip_address?: string | null
          last_email_scenario?: string | null
          last_email_sent_at?: string | null
          payment_method?: Json | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          last_email_scenario?: string | null
          last_email_sent_at?: string | null
          payment_method?: Json | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_onboarding_completed?: boolean | null
          stripe_payouts_enabled?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      messages_view: {
        Row: {
          chat_id: string | null
          content: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: number | null
          input_tokens_column: number | null
          is_built: boolean | null
          output_tokens_column: number | null
          prompt_image: string | null
          role: string | null
          screenshot: string | null
          subscription_count: number | null
          subscription_type: string | null
          theme: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      enqueue_email_job: {
        Args: {
          p_email: string
          p_payload?: Json
          p_scenario: string
          p_scheduled_at?: string
          p_user_id: string
        }
        Returns: undefined
      }
      generate_api_key: { Args: never; Returns: string }
      get_chats_with_details: {
        Args: never
        Returns: {
          artifact_code: string
          chat_id: string
          clone_url: string
          created_at: string
          deploy_subdomain: string
          deployed_at: string
          deployed_version: number
          first_user_message: string
          framework: string
          github_repo_name: string
          github_repo_url: string
          input_tokens: number
          is_deployed: boolean
          is_featured: boolean
          is_private: boolean
          last_assistant_message: string
          last_assistant_message_theme: string
          last_github_commit_sha: string
          last_github_sync: string
          likes: number
          metadata: Json
          output_tokens: number
          prompt_image: string
          remix_chat_id: string
          remix_from_version: number
          remixes_count: number
          slug: string
          title: string
          user_avatar_url: string
          user_full_name: string
          user_id: string
          views: number
        }[]
      }
      get_components: {
        Args: never
        Returns: {
          chat_id: string
          clone_url: string
          created_at: string
          first_user_message: string
          framework: string
          is_featured: boolean
          is_private: boolean
          last_assistant_message: string
          last_assistant_message_theme: string
          likes: number
          remix_chat_id: string
          slug: string
          title: string
          user_avatar_url: string
          user_full_name: string
          user_id: string
          views: number
        }[]
      }
      get_median_message_cost: {
        Args: never
        Returns: {
          average_cost: string
          median_cost: string
          message_count: number
          month: string
          processing_engine: string
        }[]
      }
      migrate_prompt_image_to_files: { Args: never; Returns: undefined }
      release_generation_lock: {
        Args: { p_chat_id: string; p_lock_id: string }
        Returns: undefined
      }
      try_acquire_generation_lock: {
        Args: {
          p_chat_id: string
          p_lock_id: string
          p_stale_threshold_minutes?: number
        }
        Returns: boolean
      }
      verify_rls_enabled: {
        Args: never
        Returns: {
          rls_enabled: boolean
          table_name: string
        }[]
      }
    }
    Enums: {
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  realtime: {
    Tables: {
      messages: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_04_28: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_04_29: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_04_30: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_05_01: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_05_02: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_05_03: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages_2026_05_04: {
        Row: {
          event: string | null
          extension: string
          id: string
          inserted_at: string
          payload: Json | null
          private: boolean | null
          topic: string
          updated_at: string
        }
        Insert: {
          event?: string | null
          extension: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic: string
          updated_at?: string
        }
        Update: {
          event?: string | null
          extension?: string
          id?: string
          inserted_at?: string
          payload?: Json | null
          private?: boolean | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          inserted_at: string | null
          version: number
        }
        Insert: {
          inserted_at?: string | null
          version: number
        }
        Update: {
          inserted_at?: string | null
          version?: number
        }
        Relationships: []
      }
      subscription: {
        Row: {
          action_filter: string | null
          claims: Json
          claims_role: unknown
          created_at: string
          entity: unknown
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id: number
          subscription_id: string
        }
        Insert: {
          action_filter?: string | null
          claims: Json
          claims_role?: unknown
          created_at?: string
          entity: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id: string
        }
        Update: {
          action_filter?: string | null
          claims?: Json
          claims_role?: unknown
          created_at?: string
          entity?: unknown
          filters?: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
          id?: never
          subscription_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_rls: {
        Args: { max_record_bytes?: number; wal: Json }
        Returns: Database["realtime"]["CompositeTypes"]["wal_rls"][]
        SetofOptions: {
          from: "*"
          to: "wal_rls"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      broadcast_changes: {
        Args: {
          event_name: string
          level?: string
          new: Record<string, unknown>
          old: Record<string, unknown>
          operation: string
          table_name: string
          table_schema: string
          topic_name: string
        }
        Returns: undefined
      }
      build_prepared_statement_sql: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          entity: unknown
          prepared_statement_name: string
        }
        Returns: string
      }
      cast: { Args: { type_: unknown; val: string }; Returns: Json }
      check_equality_op: {
        Args: {
          op: Database["realtime"]["Enums"]["equality_op"]
          type_: unknown
          val_1: string
          val_2: string
        }
        Returns: boolean
      }
      is_visible_through_filters: {
        Args: {
          columns: Database["realtime"]["CompositeTypes"]["wal_column"][]
          filters: Database["realtime"]["CompositeTypes"]["user_defined_filter"][]
        }
        Returns: boolean
      }
      list_changes: {
        Args: {
          max_changes: number
          max_record_bytes: number
          publication: unknown
          slot_name: unknown
        }
        Returns: {
          errors: string[]
          is_rls_enabled: boolean
          slot_changes_count: number
          subscription_ids: string[]
          wal: Json
        }[]
      }
      quote_wal2json: { Args: { entity: unknown }; Returns: string }
      send: {
        Args: { event: string; payload: Json; private?: boolean; topic: string }
        Returns: undefined
      }
      to_regrole: { Args: { role_name: string }; Returns: unknown }
      topic: { Args: never; Returns: string }
    }
    Enums: {
      action: "INSERT" | "UPDATE" | "DELETE" | "TRUNCATE" | "ERROR"
      equality_op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in"
    }
    CompositeTypes: {
      user_defined_filter: {
        column_name: string | null
        op: Database["realtime"]["Enums"]["equality_op"] | null
        value: string | null
      }
      wal_column: {
        name: string | null
        type_name: string | null
        type_oid: unknown
        value: Json | null
        is_pkey: boolean | null
        is_selectable: boolean | null
      }
      wal_rls: {
        wal: Json | null
        is_rls_enabled: boolean | null
        subscription_ids: string[] | null
        errors: string[] | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  supabase_functions: {
    Tables: {
      hooks: {
        Row: {
          created_at: string
          hook_name: string
          hook_table_id: number
          id: number
          request_id: number | null
        }
        Insert: {
          created_at?: string
          hook_name: string
          hook_table_id: number
          id?: number
          request_id?: number | null
        }
        Update: {
          created_at?: string
          hook_name?: string
          hook_table_id?: number
          id?: number
          request_id?: number | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          inserted_at: string
          version: string
        }
        Insert: {
          inserted_at?: string
          version: string
        }
        Update: {
          inserted_at?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  vault: {
    Tables: {
      secrets: {
        Row: {
          created_at: string
          description: string
          id: string
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      decrypted_secrets: {
        Row: {
          created_at: string | null
          decrypted_secret: string | null
          description: string | null
          id: string | null
          key_id: string | null
          name: string | null
          nonce: string | null
          secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decrypted_secret?: never
          description?: string | null
          id?: string | null
          key_id?: string | null
          name?: string | null
          nonce?: string | null
          secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret: string
        }
        Returns: string
      }
      update_secret: {
        Args: {
          new_description?: string
          new_key_id?: string
          new_name?: string
          new_secret?: string
          secret_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone"],
      oauth_authorization_status: ["pending", "approved", "denied", "expired"],
      oauth_client_type: ["public", "confidential"],
      oauth_registration_type: ["dynamic", "manual"],
      oauth_response_type: ["code"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
  coderocket: {
    Enums: {},
  },
  extensions: {
    Enums: {},
  },
  graphql: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  net: {
    Enums: {
      request_status: ["PENDING", "SUCCESS", "ERROR"],
    },
  },
  pgbouncer: {
    Enums: {},
  },
  pgsodium: {
    Enums: {
      key_status: ["default", "valid", "invalid", "expired"],
      key_type: [
        "aead-ietf",
        "aead-det",
        "hmacsha512",
        "hmacsha256",
        "auth",
        "shorthash",
        "generichash",
        "kdf",
        "secretbox",
        "secretstream",
        "stream_xchacha20",
      ],
    },
  },
  pgsodium_masks: {
    Enums: {},
  },
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
  realtime: {
    Enums: {
      action: ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR"],
      equality_op: ["eq", "neq", "lt", "lte", "gt", "gte", "in"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
  supabase_functions: {
    Enums: {},
  },
  vault: {
    Enums: {},
  },
} as const

