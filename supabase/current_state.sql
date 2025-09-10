-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.api_clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  api_key text NOT NULL UNIQUE,
  client_name text NOT NULL,
  email text NOT NULL,
  credit_balance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  CONSTRAINT api_clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.api_usage (
  id integer NOT NULL DEFAULT nextval('api_usage_id_seq'::regclass),
  client_id uuid,
  prompt text NOT NULL,
  has_image boolean NOT NULL DEFAULT false,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cost numeric NOT NULL,
  framework text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_usage_pkey PRIMARY KEY (id),
  CONSTRAINT api_usage_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.api_clients(id)
);
CREATE TABLE public.chat_likes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT chat_likes_pkey PRIMARY KEY (id),
  CONSTRAINT chat_likes_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT chat_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  artifact_code text,
  prompt_image text,
  is_featured boolean DEFAULT false,
  is_private boolean DEFAULT false,
  framework text DEFAULT ''::text,
  slug character varying UNIQUE,
  input_tokens numeric DEFAULT '0'::numeric,
  output_tokens numeric DEFAULT '0'::numeric,
  title text,
  likes numeric DEFAULT '0'::numeric,
  remix_chat_id uuid,
  remix_from_version numeric,
  metadata jsonb,
  views integer,
  clone_url text,
  github_repo_url text,
  github_repo_name text,
  last_github_sync timestamp with time zone,
  last_github_commit_sha text,
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_remix_chat_id_fkey FOREIGN KEY (remix_chat_id) REFERENCES public.chats(id),
  CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL,
  stripe_customer_id text,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.extra_messages (
  id integer NOT NULL DEFAULT nextval('extra_messages_id_seq'::regclass),
  user_id uuid NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT extra_messages_pkey PRIMARY KEY (id),
  CONSTRAINT extra_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.github_connections (
  id integer NOT NULL DEFAULT nextval('github_connections_id_seq'::regclass),
  user_id uuid NOT NULL UNIQUE,
  github_username text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_sync_at timestamp with time zone,
  CONSTRAINT github_connections_pkey PRIMARY KEY (id),
  CONSTRAINT github_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.marketplace_categories (
  id integer NOT NULL DEFAULT nextval('marketplace_categories_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  description text,
  slug character varying NOT NULL UNIQUE,
  icon character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT marketplace_categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.marketplace_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'available'::character varying, 'paid'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  payout_date timestamp with time zone,
  CONSTRAINT marketplace_earnings_pkey PRIMARY KEY (id),
  CONSTRAINT marketplace_earnings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT marketplace_earnings_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.marketplace_purchases(id)
);
CREATE TABLE public.marketplace_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  chat_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 0,
  category_id integer NOT NULL,
  title character varying NOT NULL,
  description text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  preview_image_url text,
  is_active boolean DEFAULT true,
  total_sales integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id),
  CONSTRAINT marketplace_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT marketplace_listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.marketplace_categories(id),
  CONSTRAINT marketplace_listings_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id)
);
CREATE TABLE public.marketplace_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  stripe_payout_id character varying,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_transit'::character varying, 'paid'::character varying, 'failed'::character varying, 'canceled'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  arrival_date timestamp with time zone,
  failure_reason text,
  earnings_ids ARRAY NOT NULL,
  CONSTRAINT marketplace_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT marketplace_payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id)
);
CREATE TABLE public.marketplace_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  chat_id uuid NOT NULL,
  purchased_chat_id uuid,
  price_paid_cents integer NOT NULL,
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  platform_commission_cents integer NOT NULL,
  seller_earning_cents integer NOT NULL,
  stripe_payment_intent_id character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT marketplace_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT marketplace_purchases_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT marketplace_purchases_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT marketplace_purchases_purchased_chat_id_fkey FOREIGN KEY (purchased_chat_id) REFERENCES public.chats(id),
  CONSTRAINT marketplace_purchases_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id),
  CONSTRAINT marketplace_purchases_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id)
);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  chat_id uuid NOT NULL,
  content text NOT NULL,
  role text NOT NULL,
  screenshot text,
  version numeric NOT NULL,
  theme text,
  input_tokens numeric,
  output_tokens numeric,
  is_built boolean,
  prompt_image text,
  subscription_type text,
  artifact_code text,
  cache_creation_input_tokens numeric,
  cache_read_input_tokens numeric,
  is_github_pull boolean DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id)
);
CREATE TABLE public.notification (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text NOT NULL,
  button_link text,
  button_label text,
  is_active boolean NOT NULL,
  CONSTRAINT notification_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  payment_id character varying NOT NULL,
  created timestamp without time zone,
  amount numeric,
  amount_euro numeric,
  description text,
  stripe_customer_id character varying,
  email character varying,
  payment_currency character varying,
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id)
);
CREATE TABLE public.prices (
  id text NOT NULL,
  product_id text,
  active boolean,
  description text,
  unit_amount bigint,
  currency text CHECK (char_length(currency) = 3),
  type USER-DEFINED,
  interval USER-DEFINED,
  interval_count integer,
  trial_period_days integer,
  metadata jsonb,
  CONSTRAINT prices_pkey PRIMARY KEY (id),
  CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id text NOT NULL,
  active boolean,
  name text,
  description text,
  image text,
  metadata jsonb,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
  id text NOT NULL,
  user_id uuid NOT NULL,
  status USER-DEFINED,
  metadata jsonb,
  price_id text,
  quantity integer,
  cancel_at_period_end boolean,
  created timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_start timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  current_period_end timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  cancel_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  canceled_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trial_start timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trial_end timestamp with time zone DEFAULT timezone('utc'::text, now()),
  custom_messages_per_period numeric,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT subscriptions_price_id_fkey FOREIGN KEY (price_id) REFERENCES public.prices(id)
);
CREATE TABLE public.unsubscribe_surveys (
  id integer NOT NULL DEFAULT nextval('unsubscribe_surveys_id_seq'::regclass),
  email text,
  mainreason text,
  otherreason text,
  improvementsuggestion text,
  submission_date timestamp with time zone,
  CONSTRAINT unsubscribe_surveys_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb,
  created_at timestamp with time zone DEFAULT now(),
  ip_address text,
  stripe_account_id text,
  stripe_account_status text CHECK (stripe_account_status = ANY (ARRAY['pending'::text, 'restricted'::text, 'enabled'::text])),
  stripe_onboarding_completed boolean DEFAULT false,
  stripe_payouts_enabled boolean DEFAULT false,
  stripe_charges_enabled boolean DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);