-- CodeRocket baseline migration candidate
-- Generated from supabase/baseline.schema.sql on 2026-05-01.
-- This file intentionally keeps app-owned public objects plus app-specific storage policies.
-- Full local validation with `supabase db reset` is still pending because Docker was unavailable at generation time.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE TYPE public.pricing_plan_interval AS ENUM (
    'day',
    'week',
    'month',
    'year'
);


--
-- Name: pricing_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pricing_type AS ENUM (
    'one_time',
    'recurring'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);

CREATE FUNCTION public.check_registrations_per_ip() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  ip_count INTEGER;
BEGIN
  -- Compter le nombre de comptes avec cette IP
  SELECT COUNT(*) INTO ip_count FROM public.users WHERE ip_address = NEW.ip_address;

  -- Si plus de 3 comptes utilisent la même IP, bloquer l'inscription
  -- Vous pouvez ajuster ce nombre selon vos besoins
  IF ip_count >= 3 THEN
    RAISE EXCEPTION 'Too many accounts created with this IP address.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_reserved_subdomains(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_reserved_subdomains() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  reserved_words text[] := ARRAY[
    'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'email', 'smtp',
    'ftp', 'staging', 'dev', 'test', 'demo', 'preview', 'webcontainer',
    'static', 'assets', 'cdn', 'media', 'upload', 'download', 'help',
    'support', 'docs', 'documentation', 'blog', 'news', 'forum', 'chat',
    'status', 'monitor', 'analytics', 'metrics', 'billing', 'payment',
    'checkout', 'cart', 'shop', 'store', 'account', 'profile', 'settings',
    'login', 'signup', 'register', 'auth', 'oauth', 'sso', 'webhook',
    'callback', 'confirm', 'verify', 'activate', 'reset', 'forgot',
    'secure', 'ssl', 'tls', 'vpn', 'proxy', 'gateway', 'router',
    'server', 'host', 'node', 'cluster', 'cloud', 'saas', 'paas', 'iaas'
  ];
BEGIN
  IF NEW.deploy_subdomain IS NOT NULL THEN
    IF NEW.deploy_subdomain = ANY(reserved_words) THEN
      RAISE EXCEPTION 'This subdomain is reserved and cannot be used';
    END IF;

    IF LENGTH(NEW.deploy_subdomain) < 3 THEN
      RAISE EXCEPTION 'Subdomain must be at least 3 characters long';
    END IF;

    IF LENGTH(NEW.deploy_subdomain) > 63 THEN
      RAISE EXCEPTION 'Subdomain must be less than 63 characters';
    END IF;

    IF NEW.deploy_subdomain !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
      RAISE EXCEPTION 'Subdomain can only contain lowercase letters, numbers, and hyphens, and must start and end with a letter or number';
    END IF;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: enqueue_email_job(uuid, text, text, jsonb, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_email_job(p_user_id uuid, p_email text, p_scenario text, p_payload jsonb DEFAULT '{}'::jsonb, p_scheduled_at timestamp with time zone DEFAULT timezone('utc'::text, now())) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.email_jobs (user_id, email, scenario, payload, scheduled_at)
  values (
    p_user_id,
    p_email,
    p_scenario,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_scheduled_at, timezone('utc', now()))
  );
end;
$$;


--
-- Name: generate_api_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_api_key() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  key TEXT;
  unique_key BOOLEAN;
BEGIN
  unique_key := FALSE;
  WHILE NOT unique_key LOOP
    -- Generate a random API key with prefix 'cr_' (CodeRocket)
    key := 'cr_' || encode(gen_random_bytes(24), 'base64');

    -- Check if this key already exists
    SELECT NOT EXISTS(SELECT 1 FROM api_clients WHERE api_key = key) INTO unique_key;
  END LOOP;

  RETURN key;
END;
$$;


--
-- Name: get_chats_with_details(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_chats_with_details() RETURNS TABLE(chat_id uuid, user_id uuid, user_full_name text, user_avatar_url text, is_featured boolean, is_private boolean, created_at timestamp with time zone, slug text, title text, likes numeric, first_user_message text, last_assistant_message text, last_assistant_message_theme text, framework text, remix_chat_id uuid, views integer, clone_url text, artifact_code text, prompt_image text, input_tokens numeric, output_tokens numeric, remix_from_version numeric, metadata jsonb, github_repo_url text, github_repo_name text, last_github_sync timestamp with time zone, last_github_commit_sha text, deploy_subdomain text, deployed_at timestamp with time zone, deployed_version integer, is_deployed boolean, remixes_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH first_messages AS (
        SELECT DISTINCT ON (m.chat_id)
            m.chat_id,
            m.content AS first_user_message
        FROM messages m
        WHERE m.role = 'user'
        ORDER BY m.chat_id, m.created_at ASC
    ),
    last_assistant_messages AS (
        SELECT DISTINCT ON (m.chat_id)
            m.chat_id,
            m.screenshot AS last_assistant_message,
            m.theme AS last_assistant_message_theme
        FROM messages m
        WHERE m.role = 'assistant'
        ORDER BY m.chat_id, m.created_at DESC
    ),
    remixes_counts AS (
        SELECT
            r.remix_chat_id,
            COUNT(*) AS remixes_count
        FROM chats r
        WHERE r.remix_chat_id IS NOT NULL
        GROUP BY r.remix_chat_id
    )
    SELECT
        c.id AS chat_id,
        u.id AS user_id,
        u.full_name AS user_full_name,
        u.avatar_url AS user_avatar_url,
        c.is_featured,
        c.is_private,
        c.created_at,
        c.slug::text,
        c.title,
        c.likes,
        fm.first_user_message,
        lam.last_assistant_message,
        lam.last_assistant_message_theme,
        c.framework,
        c.remix_chat_id,
        c.views,
        c.clone_url,
        c.artifact_code,
        c.prompt_image,
        c.input_tokens,
        c.output_tokens,
        c.remix_from_version,
        c.metadata,
        c.github_repo_url,
        c.github_repo_name,
        c.last_github_sync,
        c.last_github_commit_sha,
        c.deploy_subdomain,
        c.deployed_at,
        c.deployed_version,
        c.is_deployed,
        COALESCE(rc.remixes_count, 0) AS remixes_count
    FROM chats c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN first_messages fm ON fm.chat_id = c.id
    LEFT JOIN last_assistant_messages lam ON lam.chat_id = c.id
    LEFT JOIN remixes_counts rc ON rc.remix_chat_id = c.id
    WHERE EXISTS (
        SELECT 1
        FROM messages m
        WHERE m.chat_id = c.id
          AND m.role = 'assistant'
    )
    ORDER BY c.created_at DESC;
END;
$$;


--
-- Name: get_components(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_components() RETURNS TABLE(chat_id uuid, user_id uuid, user_full_name text, user_avatar_url text, is_featured boolean, is_private boolean, created_at timestamp without time zone, slug character varying, title text, likes numeric, first_user_message text, last_assistant_message text, last_assistant_message_theme text, framework text, remix_chat_id uuid, views integer, clone_url text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH first_messages AS (
        SELECT DISTINCT ON (m.chat_id) 
            m.chat_id,
            m.content AS first_user_message
        FROM messages m
        WHERE m.role = 'user'
        ORDER BY m.chat_id, m.created_at ASC
    ),
    last_assistant_messages AS (
        SELECT DISTINCT ON (m.chat_id) 
            m.chat_id,
            m.screenshot AS last_assistant_message,
            m.theme AS last_assistant_message_theme
        FROM messages m
        WHERE m.role = 'assistant'
        ORDER BY m.chat_id, m.created_at DESC
    )
    SELECT
        c.id AS chat_id,
        u.id AS user_id,
        u.full_name AS user_full_name,
        u.avatar_url AS user_avatar_url,
        c.is_featured,
        c.is_private,
        c.created_at::timestamp,
        c.slug,
        c.title,
        c.likes,
        fm.first_user_message,
        lam.last_assistant_message,
        lam.last_assistant_message_theme,
        c.framework AS framework,
        c.remix_chat_id AS remix_chat_id,
        c.views AS views,
        c.clone_url AS clone_url
    FROM chats c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN first_messages fm ON fm.chat_id = c.id
    LEFT JOIN last_assistant_messages lam ON lam.chat_id = c.id
    WHERE EXISTS (
        SELECT 1
        FROM messages m
        WHERE m.chat_id = c.id
          AND m.role = 'assistant'
    )
    ORDER BY c.created_at DESC;
END;
$$;


--
-- Name: get_median_message_cost(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_median_message_cost() RETURNS TABLE(month text, processing_engine text, message_count bigint, average_cost text, median_cost text)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY
    WITH MessageCosts AS (
        SELECT
            m.id AS message_id,
            m.chat_id,
            m.input_tokens,
            m.output_tokens,
            DATE_TRUNC('month', m.created_at) AS message_month,
            ROW_NUMBER() OVER (PARTITION BY m.chat_id ORDER BY m.created_at) AS message_order
        FROM
            messages m
        WHERE
            m.input_tokens IS NOT NULL OR m.output_tokens IS NOT NULL
    ),
    CostCalculation AS (
        SELECT
            message_id,
            chat_id,
            input_tokens,
            output_tokens,
            message_order,
            message_month as month,
            'Sonnet' AS processing_engine,
            ROUND(
                COALESCE((input_tokens / 1000000.0 * 3.75), 0) +
                COALESCE((output_tokens / 1000000.0 * 15), 0),
                3
            ) AS total_cost
        FROM
            MessageCosts
    )
    SELECT
        TO_CHAR(cc.month, 'YYYY-MM') AS month,
        cc.processing_engine,
        COUNT(*) AS message_count,
        CONCAT(ROUND(AVG(cc.total_cost), 3), ' $') AS average_cost,
        CONCAT(ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cc.total_cost) AS NUMERIC), 3), ' $') AS median_cost
    FROM
        CostCalculation cc
    GROUP BY
        cc.month, cc.processing_engine
    ORDER BY
        cc.month DESC
    LIMIT 1;
END;
$_$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.users (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email;

  if new.email is not null then
    perform public.enqueue_email_job(
      new.id,
      new.email,
      'onboarding-welcome',
      jsonb_build_object(
        'userName',
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
      )
    );
  end if;

  return new;
end;
$$;


--
-- Name: migrate_prompt_image_to_files(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_prompt_image_to_files() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE public.messages
  SET files = jsonb_build_array(
    jsonb_build_object('url', prompt_image, 'order', 0, 'type', 'image')
  )
  WHERE prompt_image IS NOT NULL
  AND prompt_image != ''
  AND (files IS NULL OR files = '[]'::jsonb);
END;
$$;


--
-- Name: release_generation_lock(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_generation_lock(p_chat_id uuid, p_lock_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.generation_locks
  WHERE chat_id = p_chat_id AND lock_id = p_lock_id;

  UPDATE public.chats
  SET active_stream_id = NULL,
      active_stream_started_at = NULL
  WHERE id = p_chat_id AND active_stream_id = p_lock_id;
END;
$$;


--
-- Name: FUNCTION release_generation_lock(p_chat_id uuid, p_lock_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.release_generation_lock(p_chat_id uuid, p_lock_id text) IS 'Releases a generation lock for a chat.';


--
-- Name: set_email_jobs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_email_jobs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


--
-- Name: set_user_files_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_user_files_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


--
-- Name: try_acquire_generation_lock(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.try_acquire_generation_lock(p_chat_id uuid, p_lock_id text, p_stale_threshold_minutes integer DEFAULT 5) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_stale_threshold TIMESTAMPTZ;
BEGIN
  v_stale_threshold := NOW() - (p_stale_threshold_minutes || ' minutes')::INTERVAL;

  -- First, clean up any stale locks for this chat
  DELETE FROM public.generation_locks
  WHERE chat_id = p_chat_id
    AND created_at < v_stale_threshold;

  -- Try to INSERT our lock - this will fail if another lock exists (unique constraint)
  BEGIN
    INSERT INTO public.generation_locks (chat_id, lock_id, created_at)
    VALUES (p_chat_id, p_lock_id, NOW());

    -- Also update the chats table for compatibility
    UPDATE public.chats
    SET active_stream_id = p_lock_id,
        active_stream_started_at = NOW()
    WHERE id = p_chat_id;

    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    -- Lock already exists and is not stale
    RETURN FALSE;
  END;
END;
$$;


--
-- Name: FUNCTION try_acquire_generation_lock(p_chat_id uuid, p_lock_id text, p_stale_threshold_minutes integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.try_acquire_generation_lock(p_chat_id uuid, p_lock_id text, p_stale_threshold_minutes integer) IS 'Atomically acquires a generation lock using INSERT with unique constraint. Returns TRUE if lock acquired, FALSE if another generation is in progress.';


--
-- Name: update_custom_domains_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_custom_domains_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_custom_domain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_custom_domain() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
BEGIN
  IF NEW.domain IS NOT NULL THEN
    IF NEW.domain !~ '^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid domain format. Must be a valid domain name (e.g., example.com or subdomain.example.com)';
    END IF;

    IF NEW.domain ~ '\s' THEN
      RAISE EXCEPTION 'Domain cannot contain spaces';
    END IF;

    IF LENGTH(NEW.domain) > 253 THEN
      RAISE EXCEPTION 'Domain name too long (max 253 characters)';
    END IF;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: verify_rls_enabled(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_rls_enabled() RETURNS TABLE(table_name text, rls_enabled boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text,
    c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('chats', 'messages')
  ORDER BY c.relname;
END;
$$;

SET default_table_access_method = heap;

--
-- Name: chat_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    config_override jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE chat_integrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_integrations IS 'Links chats to specific integrations with per-chat configuration';


--
-- Name: COLUMN chat_integrations.config_override; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chat_integrations.config_override IS 'Optional per-chat configuration override';


--
-- Name: chat_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_likes (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    chat_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: chat_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.chat_likes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.chat_likes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chat_secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    secret_id uuid NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE chat_secrets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_secrets IS 'Links secrets to specific chats/projects';


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chats (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    artifact_code text,
    prompt_image text,
    is_featured boolean DEFAULT false,
    is_private boolean DEFAULT false,
    framework text DEFAULT ''::text,
    slug character varying,
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
    deploy_subdomain text,
    deployed_at timestamp with time zone,
    deployed_version integer,
    is_deployed boolean DEFAULT false,
    active_stream_id text,
    active_stream_started_at timestamp with time zone,
    auto_deploy boolean DEFAULT true
);

ALTER TABLE ONLY public.chats REPLICA IDENTITY FULL;


--
-- Name: TABLE chats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chats IS 'Chats table with RLS enabled. Server-side operations use service role and bypass RLS. Client-side operations are restricted by policies.';


--
-- Name: COLUMN chats.deploy_subdomain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.deploy_subdomain IS 'Custom subdomain for deployed application (e.g., myapp.coderocket.app)';


--
-- Name: COLUMN chats.deployed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.deployed_at IS 'Timestamp when the application was deployed';


--
-- Name: COLUMN chats.deployed_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.deployed_version IS 'Version number that is currently deployed';


--
-- Name: COLUMN chats.is_deployed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.is_deployed IS 'Whether the application is currently deployed';


--
-- Name: COLUMN chats.active_stream_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.active_stream_id IS 'ID of the currently active resumable stream for this chat, used to resume streaming after page refresh';


--
-- Name: COLUMN chats.active_stream_started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.active_stream_started_at IS 'Timestamp when the active stream started, used to detect and cleanup stale streams';


--
-- Name: COLUMN chats.auto_deploy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chats.auto_deploy IS 'Whether to automatically deploy new versions when they are built (only applies when is_deployed is true)';


--
-- Name: custom_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    user_id uuid NOT NULL,
    domain text NOT NULL,
    verification_token text NOT NULL,
    verification_method text DEFAULT 'dns'::text NOT NULL,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    ssl_status text DEFAULT 'pending'::text,
    ssl_certificate_id text,
    ssl_issued_at timestamp with time zone,
    ssl_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE custom_domains; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.custom_domains IS 'Custom domains configured by users for their deployed applications';


--
-- Name: COLUMN custom_domains.domain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.custom_domains.domain IS 'The custom domain (e.g., app.example.com)';


--
-- Name: COLUMN custom_domains.verification_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.custom_domains.verification_token IS 'Unique token for DNS verification';


--
-- Name: COLUMN custom_domains.verification_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.custom_domains.verification_method IS 'Method used for domain verification (dns, file)';


--
-- Name: COLUMN custom_domains.is_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.custom_domains.is_verified IS 'Whether the domain ownership has been verified';


--
-- Name: COLUMN custom_domains.ssl_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.custom_domains.ssl_status IS 'Status of SSL certificate (pending, active, expired, failed)';


--
-- Name: COLUMN custom_domains.ssl_certificate_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.custom_domains.ssl_certificate_id IS 'Reference to the SSL certificate';


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid NOT NULL,
    stripe_customer_id text
);


--
-- Name: email_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    scenario text NOT NULL,
    payload jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    scheduled_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT email_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: extra_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extra_messages (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: extra_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.extra_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: extra_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.extra_messages_id_seq OWNED BY public.extra_messages.id;


--
-- Name: generation_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_locks (
    chat_id uuid NOT NULL,
    lock_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: github_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.github_connections (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    github_username text NOT NULL,
    refresh_token text,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sync_at timestamp with time zone,
    access_token text
);


--
-- Name: github_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.github_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: github_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.github_connections_id_seq OWNED BY public.github_connections.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
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
    files jsonb DEFAULT '[]'::jsonb,
    migration_executed_at timestamp with time zone,
    migrations_executed jsonb DEFAULT '[]'::jsonb,
    cost_usd numeric DEFAULT 0,
    model_used text,
    build_error jsonb,
    selected_element jsonb,
    clone_another_page text,
    is_streaming boolean DEFAULT false,
    is_building boolean DEFAULT false
);

ALTER TABLE ONLY public.messages REPLICA IDENTITY FULL;


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Messages table with RLS enabled. Access is controlled through chat ownership.';


--
-- Name: COLUMN messages.files; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.files IS 'Array of file URLs in JSONB format. Example: [{"url": "path/to/file.jpg", "order": 0, "type": "image"}]';


--
-- Name: COLUMN messages.migration_executed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.migration_executed_at IS 'Timestamp when the SQL migration associated with this message was executed. NULL means not executed yet.';


--
-- Name: COLUMN messages.migrations_executed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.migrations_executed IS 'Array of executed migrations in JSONB format. Example: [{"name": "001_users.sql", "executed_at": "2025-01-30T10:00:00Z"}]';


--
-- Name: COLUMN messages.cost_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.cost_usd IS 'Cost in USD for this message generation';


--
-- Name: COLUMN messages.model_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.model_used IS 'AI model used for this generation';


--
-- Name: COLUMN messages.build_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.build_error IS 'Stores build error information from the builder API';


--
-- Name: COLUMN messages.is_building; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.is_building IS 'Indicates if a build is currently in progress for this message version';


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.messages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    user_id uuid NOT NULL,
    status public.subscription_status,
    metadata jsonb,
    price_id text,
    quantity integer,
    cancel_at_period_end boolean,
    created timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_start timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    cancel_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    canceled_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    trial_start timestamp with time zone DEFAULT timezone('utc'::text, now()),
    trial_end timestamp with time zone DEFAULT timezone('utc'::text, now()),
    custom_messages_per_period numeric
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    billing_address jsonb,
    payment_method jsonb,
    created_at timestamp with time zone DEFAULT now(),
    ip_address text,
    stripe_account_id text,
    stripe_account_status text,
    stripe_onboarding_completed boolean DEFAULT false,
    stripe_payouts_enabled boolean DEFAULT false,
    stripe_charges_enabled boolean DEFAULT false,
    last_email_scenario text,
    last_email_sent_at timestamp with time zone,
    email text,
    CONSTRAINT users_stripe_account_status_check CHECK ((stripe_account_status = ANY (ARRAY['pending'::text, 'restricted'::text, 'enabled'::text])))
);


--
-- Name: COLUMN users.last_email_scenario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_email_scenario IS 'Last automated email scenario sent to this user';


--
-- Name: COLUMN users.last_email_sent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_email_sent_at IS 'Timestamp of the last automated email sent to this user';


--
-- Name: messages_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.messages_view AS
 SELECT m.id,
    m.created_at,
    m.chat_id,
    m.content,
    m.role,
    m.screenshot,
    m.version,
    m.theme,
    m.is_built,
    m.prompt_image,
    m.subscription_type,
    m.input_tokens AS input_tokens_column,
    m.output_tokens AS output_tokens_column,
    u.full_name,
    a.email,
    ( SELECT count(*) AS count
           FROM public.subscriptions s
          WHERE (s.user_id = c.user_id)) AS subscription_count
   FROM (((public.messages m
     JOIN public.chats c ON ((m.chat_id = c.id)))
     JOIN public.users u ON ((c.user_id = u.id)))
     JOIN auth.users a ON ((u.id = a.id)));


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    button_link text,
    button_label text,
    is_active boolean NOT NULL
);


--
-- Name: notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notification ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    payment_id character varying(255) NOT NULL,
    created timestamp without time zone,
    amount numeric(10,2),
    amount_euro numeric(10,2),
    description text,
    stripe_customer_id character varying(255),
    email character varying(255),
    payment_currency character varying
);


--
-- Name: prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prices (
    id text NOT NULL,
    product_id text,
    active boolean,
    description text,
    unit_amount bigint,
    currency text,
    type public.pricing_type,
    "interval" public.pricing_plan_interval,
    interval_count integer,
    trial_period_days integer,
    metadata jsonb,
    CONSTRAINT prices_currency_check CHECK ((char_length(currency) = 3))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    active boolean,
    name text,
    description text,
    image text,
    metadata jsonb
);


--
-- Name: token_usage_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_usage_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    chat_id uuid NOT NULL,
    message_id bigint,
    usage_type text NOT NULL,
    model_used text NOT NULL,
    input_tokens numeric DEFAULT 0 NOT NULL,
    output_tokens numeric DEFAULT 0 NOT NULL,
    cache_creation_input_tokens numeric DEFAULT 0 NOT NULL,
    cache_read_input_tokens numeric DEFAULT 0 NOT NULL,
    cost_usd numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT token_usage_tracking_usage_type_check CHECK ((usage_type = ANY (ARRAY['generation'::text, 'improve_prompt'::text])))
);


--
-- Name: TABLE token_usage_tracking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.token_usage_tracking IS 'Tracks token usage and costs for accurate token-based pricing';


--
-- Name: COLUMN token_usage_tracking.usage_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.token_usage_tracking.usage_type IS 'Type of usage: generation (AI component generation) or improve_prompt (prompt enhancement)';


--
-- Name: COLUMN token_usage_tracking.cost_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.token_usage_tracking.cost_usd IS 'Actual cost in USD for this usage';


--
-- Name: unsubscribe_surveys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unsubscribe_surveys (
    id integer NOT NULL,
    email text,
    mainreason text,
    otherreason text,
    improvementsuggestion text,
    submission_date timestamp with time zone
);


--
-- Name: unsubscribe_surveys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unsubscribe_surveys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unsubscribe_surveys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unsubscribe_surveys_id_seq OWNED BY public.unsubscribe_surveys.id;


--
-- Name: user_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    file_type text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    original_name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_files_file_type_check CHECK ((file_type = ANY (ARRAY['image'::text, 'pdf'::text, 'text'::text])))
);


--
-- Name: user_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    integration_type text NOT NULL,
    name text NOT NULL,
    config jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_integrations_integration_type_check CHECK ((integration_type = ANY (ARRAY['supabase'::text, 'stripe'::text, 'blob'::text, 'resend'::text, 'auth'::text, 'figma'::text])))
);


--
-- Name: TABLE user_integrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_integrations IS 'Stores user integration configurations (Supabase, Stripe, Blob, Resend, Auth, Figma, etc.)';


--
-- Name: COLUMN user_integrations.config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_integrations.config IS 'Encrypted JSON configuration for the integration (API keys, URLs, etc.)';


--
-- Name: user_secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    encrypted_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    header_name text,
    injection_method text DEFAULT 'header'::text,
    api_domain text,
    CONSTRAINT user_secrets_injection_method_check CHECK (((injection_method = ANY (ARRAY['header'::text, 'query'::text, 'body'::text])) OR (injection_method IS NULL)))
);


--
-- Name: TABLE user_secrets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_secrets IS 'Stores user API keys and secrets (encrypted)';


--
-- Name: COLUMN user_secrets.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_secrets.name IS 'Display name for the secret (e.g., "OpenAI API Key")';


--
-- Name: COLUMN user_secrets.key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_secrets.key IS 'Environment variable key name (e.g., "OPENAI_API_KEY")';


--
-- Name: COLUMN user_secrets.encrypted_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_secrets.encrypted_value IS 'Encrypted secret value';


--
-- Name: COLUMN user_secrets.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_secrets.description IS 'Optional description of what this secret is used for';


--
-- Name: COLUMN user_secrets.header_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_secrets.header_name IS 'Name of the header to use when injecting this secret (e.g., "X-API-Key")';


--
-- Name: COLUMN user_secrets.injection_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_secrets.injection_method IS 'How to inject the secret: header, query, or body';


--
-- Name: COLUMN user_secrets.api_domain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_secrets.api_domain IS 'Target API domain for this secret (for validation and routing)';

ALTER TABLE ONLY public.extra_messages ALTER COLUMN id SET DEFAULT nextval('public.extra_messages_id_seq'::regclass);


--
-- Name: github_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_connections ALTER COLUMN id SET DEFAULT nextval('public.github_connections_id_seq'::regclass);


--
-- Name: unsubscribe_surveys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unsubscribe_surveys ALTER COLUMN id SET DEFAULT nextval('public.unsubscribe_surveys_id_seq'::regclass);


--
-- Name: chat_integrations chat_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_integrations
    ADD CONSTRAINT chat_integrations_pkey PRIMARY KEY (id);


--
-- Name: chat_integrations chat_integrations_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_integrations
    ADD CONSTRAINT chat_integrations_unique UNIQUE (chat_id, integration_id);


--
-- Name: chat_likes chat_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_likes
    ADD CONSTRAINT chat_likes_pkey PRIMARY KEY (id);


--
-- Name: chat_secrets chat_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_secrets
    ADD CONSTRAINT chat_secrets_pkey PRIMARY KEY (id);


--
-- Name: chat_secrets chat_secrets_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_secrets
    ADD CONSTRAINT chat_secrets_unique UNIQUE (chat_id, secret_id);


--
-- Name: chats chats_deploy_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_deploy_subdomain_key UNIQUE (deploy_subdomain);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: chats chats_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_slug_key UNIQUE (slug);


--
-- Name: custom_domains custom_domains_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_domains
    ADD CONSTRAINT custom_domains_chat_id_key UNIQUE (chat_id);


--
-- Name: custom_domains custom_domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_domains
    ADD CONSTRAINT custom_domains_domain_key UNIQUE (domain);


--
-- Name: custom_domains custom_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_domains
    ADD CONSTRAINT custom_domains_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: email_jobs email_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_jobs
    ADD CONSTRAINT email_jobs_pkey PRIMARY KEY (id);


--
-- Name: extra_messages extra_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extra_messages
    ADD CONSTRAINT extra_messages_pkey PRIMARY KEY (id);


--
-- Name: generation_locks generation_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_locks
    ADD CONSTRAINT generation_locks_pkey PRIMARY KEY (chat_id);


--
-- Name: github_connections github_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_connections
    ADD CONSTRAINT github_connections_pkey PRIMARY KEY (id);


--
-- Name: github_connections github_connections_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_connections
    ADD CONSTRAINT github_connections_user_id_key UNIQUE (user_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: token_usage_tracking token_usage_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_usage_tracking
    ADD CONSTRAINT token_usage_tracking_pkey PRIMARY KEY (id);


--
-- Name: unsubscribe_surveys unsubscribe_surveys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unsubscribe_surveys
    ADD CONSTRAINT unsubscribe_surveys_pkey PRIMARY KEY (id);


--
-- Name: user_files user_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_pkey PRIMARY KEY (id);


--
-- Name: user_integrations user_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_integrations
    ADD CONSTRAINT user_integrations_pkey PRIMARY KEY (id);


--
-- Name: user_integrations user_integrations_unique_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_integrations
    ADD CONSTRAINT user_integrations_unique_name UNIQUE (user_id, integration_type, name);


--
-- Name: user_secrets user_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_secrets
    ADD CONSTRAINT user_secrets_pkey PRIMARY KEY (id);


--
-- Name: user_secrets user_secrets_unique_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_secrets
    ADD CONSTRAINT user_secrets_unique_name UNIQUE (user_id, name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: email_jobs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_jobs_created_idx ON public.email_jobs USING btree (created_at);


--
-- Name: email_jobs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_jobs_status_idx ON public.email_jobs USING btree (status, scheduled_at);


--
-- Name: idx_chat_integrations_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_integrations_chat_id ON public.chat_integrations USING btree (chat_id);


--
-- Name: idx_chat_integrations_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_integrations_enabled ON public.chat_integrations USING btree (chat_id, is_enabled);


--
-- Name: idx_chat_integrations_integration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_integrations_integration_id ON public.chat_integrations USING btree (integration_id);


--
-- Name: idx_chat_likes_chat_id_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_likes_chat_id_user_id ON public.chat_likes USING btree (chat_id, user_id);


--
-- Name: idx_chat_likes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_likes_user_id ON public.chat_likes USING btree (user_id);


--
-- Name: idx_chat_secrets_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_secrets_chat_id ON public.chat_secrets USING btree (chat_id);


--
-- Name: idx_chat_secrets_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_secrets_enabled ON public.chat_secrets USING btree (chat_id, is_enabled);


--
-- Name: idx_chat_secrets_secret_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_secrets_secret_id ON public.chat_secrets USING btree (secret_id);


--
-- Name: idx_chats_active_stream_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_active_stream_id ON public.chats USING btree (active_stream_id) WHERE (active_stream_id IS NOT NULL);


--
-- Name: idx_chats_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_created_at ON public.chats USING btree (created_at DESC);


--
-- Name: idx_chats_deploy_subdomain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_deploy_subdomain ON public.chats USING btree (deploy_subdomain);


--
-- Name: idx_chats_framework_is_private_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_framework_is_private_created_at ON public.chats USING btree (framework, is_private, created_at DESC) WHERE (is_private = false);


--
-- Name: idx_chats_is_deployed_deployed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_is_deployed_deployed_at ON public.chats USING btree (is_deployed, deployed_at DESC) WHERE ((is_deployed = true) AND (deployed_at IS NOT NULL));


--
-- Name: idx_chats_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_is_featured ON public.chats USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_chats_is_private; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_is_private ON public.chats USING btree (is_private);


--
-- Name: idx_chats_is_private_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_is_private_id ON public.chats USING btree (is_private, id) WHERE (is_private = false);


--
-- Name: idx_chats_likes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_likes_created_at ON public.chats USING btree (likes DESC, created_at DESC) WHERE (is_private = false);


--
-- Name: idx_chats_remix_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_remix_chat_id ON public.chats USING btree (remix_chat_id) WHERE (remix_chat_id IS NOT NULL);


--
-- Name: idx_chats_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_slug ON public.chats USING btree (slug);


--
-- Name: idx_chats_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_user_id ON public.chats USING btree (user_id);


--
-- Name: idx_chats_user_id_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chats_user_id_id ON public.chats USING btree (user_id, id);


--
-- Name: idx_custom_domains_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_domains_chat_id ON public.custom_domains USING btree (chat_id);


--
-- Name: idx_custom_domains_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_domains_domain ON public.custom_domains USING btree (domain);


--
-- Name: idx_custom_domains_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_domains_user_id ON public.custom_domains USING btree (user_id);


--
-- Name: idx_custom_domains_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_domains_verified ON public.custom_domains USING btree (is_verified);


--
-- Name: idx_messages_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id);


--
-- Name: idx_messages_chat_id_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_chat_id_role ON public.messages USING btree (chat_id, role);


--
-- Name: idx_messages_chat_id_role_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_chat_id_role_version ON public.messages USING btree (chat_id, role, version DESC);


--
-- Name: idx_messages_chat_id_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_chat_id_version ON public.messages USING btree (chat_id, version DESC);


--
-- Name: idx_messages_files; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_files ON public.messages USING gin (files);


--
-- Name: idx_messages_is_building; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_is_building ON public.messages USING btree (is_building) WHERE (is_building = true);


--
-- Name: idx_messages_is_github_pull; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_is_github_pull ON public.messages USING btree (is_github_pull);


--
-- Name: idx_messages_is_streaming; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_is_streaming ON public.messages USING btree (is_streaming) WHERE (is_streaming = true);


--
-- Name: idx_messages_migration_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_migration_executed ON public.messages USING btree (migration_executed_at) WHERE (migration_executed_at IS NOT NULL);


--
-- Name: idx_messages_migrations_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_migrations_executed ON public.messages USING gin (migrations_executed);


--
-- Name: idx_messages_role_chat_id_created_at_asc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_role_chat_id_created_at_asc ON public.messages USING btree (role, chat_id, created_at) WHERE (role = 'user'::text);


--
-- Name: idx_messages_role_chat_id_created_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_role_chat_id_created_at_desc ON public.messages USING btree (role, chat_id, created_at DESC) WHERE (role = 'assistant'::text);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_token_usage_tracking_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_usage_tracking_created_at ON public.token_usage_tracking USING btree (created_at);


--
-- Name: idx_token_usage_tracking_usage_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_usage_tracking_usage_type ON public.token_usage_tracking USING btree (usage_type);


--
-- Name: idx_token_usage_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_usage_tracking_user_id ON public.token_usage_tracking USING btree (user_id);


--
-- Name: idx_user_integrations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_integrations_active ON public.user_integrations USING btree (user_id, is_active);


--
-- Name: idx_user_integrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_integrations_type ON public.user_integrations USING btree (integration_type);


--
-- Name: idx_user_integrations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_integrations_user_id ON public.user_integrations USING btree (user_id);


--
-- Name: idx_user_secrets_api_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_secrets_api_domain ON public.user_secrets USING btree (api_domain) WHERE (api_domain IS NOT NULL);


--
-- Name: idx_user_secrets_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_secrets_key ON public.user_secrets USING btree (key);


--
-- Name: idx_user_secrets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_secrets_user_id ON public.user_secrets USING btree (user_id);


--
-- Name: idx_users_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_ip_address ON public.users USING btree (ip_address);


--
-- Name: idx_users_stripe_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_stripe_account_id ON public.users USING btree (stripe_account_id);


--
-- Name: user_files_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_files_created_at_idx ON public.user_files USING btree (created_at DESC);


--
-- Name: user_files_file_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_files_file_type_idx ON public.user_files USING btree (file_type);


--
-- Name: user_files_storage_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_files_storage_path_idx ON public.user_files USING btree (storage_path);


--
-- Name: user_files_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_files_user_id_idx ON public.user_files USING btree (user_id);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: email_jobs email_jobs_set_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER email_jobs_set_updated BEFORE UPDATE ON public.email_jobs FOR EACH ROW EXECUTE FUNCTION public.set_email_jobs_updated_at();


--
-- Name: users limit_ip_registrations; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER limit_ip_registrations BEFORE INSERT ON public.users FOR EACH ROW WHEN (((new.ip_address IS NOT NULL) AND (new.ip_address <> ''::text))) EXECUTE FUNCTION public.check_registrations_per_ip();


--
-- Name: chat_integrations update_chat_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_integrations_updated_at BEFORE UPDATE ON public.chat_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_domains update_custom_domains_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_domains_updated_at_trigger BEFORE UPDATE ON public.custom_domains FOR EACH ROW EXECUTE FUNCTION public.update_custom_domains_updated_at();


--
-- Name: user_integrations update_user_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_integrations_updated_at BEFORE UPDATE ON public.user_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_secrets update_user_secrets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_secrets_updated_at BEFORE UPDATE ON public.user_secrets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_files user_files_set_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_files_set_updated BEFORE UPDATE ON public.user_files FOR EACH ROW EXECUTE FUNCTION public.set_user_files_updated_at();


--
-- Name: custom_domains validate_custom_domain_before_insert_or_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_custom_domain_before_insert_or_update BEFORE INSERT OR UPDATE ON public.custom_domains FOR EACH ROW EXECUTE FUNCTION public.validate_custom_domain();


--
-- Name: chats validate_subdomain_before_insert_or_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_subdomain_before_insert_or_update BEFORE INSERT OR UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.check_reserved_subdomains();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: chat_integrations chat_integrations_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_integrations
    ADD CONSTRAINT chat_integrations_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_integrations chat_integrations_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_integrations
    ADD CONSTRAINT chat_integrations_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.user_integrations(id) ON DELETE CASCADE;


--
-- Name: chat_likes chat_likes_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_likes
    ADD CONSTRAINT chat_likes_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id);


--
-- Name: chat_likes chat_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_likes
    ADD CONSTRAINT chat_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chat_secrets chat_secrets_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_secrets
    ADD CONSTRAINT chat_secrets_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_secrets chat_secrets_secret_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_secrets
    ADD CONSTRAINT chat_secrets_secret_id_fkey FOREIGN KEY (secret_id) REFERENCES public.user_secrets(id) ON DELETE CASCADE;


--
-- Name: chats chats_remix_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_remix_chat_id_fkey FOREIGN KEY (remix_chat_id) REFERENCES public.chats(id);


--
-- Name: chats chats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: custom_domains custom_domains_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_domains
    ADD CONSTRAINT custom_domains_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: custom_domains custom_domains_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_domains
    ADD CONSTRAINT custom_domains_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customers customers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: email_jobs email_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_jobs
    ADD CONSTRAINT email_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: extra_messages extra_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extra_messages
    ADD CONSTRAINT extra_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: generation_locks generation_locks_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_locks
    ADD CONSTRAINT generation_locks_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: github_connections github_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.github_connections
    ADD CONSTRAINT github_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: prices prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: subscriptions subscriptions_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_price_id_fkey FOREIGN KEY (price_id) REFERENCES public.prices(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: token_usage_tracking token_usage_tracking_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_usage_tracking
    ADD CONSTRAINT token_usage_tracking_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: token_usage_tracking token_usage_tracking_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_usage_tracking
    ADD CONSTRAINT token_usage_tracking_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: token_usage_tracking token_usage_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_usage_tracking
    ADD CONSTRAINT token_usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_files user_files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_integrations user_integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_integrations
    ADD CONSTRAINT user_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_secrets user_secrets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_secrets
    ADD CONSTRAINT user_secrets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);

-- Ensure the auth signup trigger remains wired in local environments.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY " All can view messages data." ON public.messages FOR SELECT USING (true);


--
-- Name: prices Allow public read-only access.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read-only access." ON public.prices FOR SELECT USING (true);


--
-- Name: products Allow public read-only access.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read-only access." ON public.products FOR SELECT USING (true);


--
-- Name: custom_domains Anyone can view custom domains for public deployed chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view custom domains for public deployed chats" ON public.custom_domains FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = custom_domains.chat_id) AND (chats.is_private = false) AND (chats.is_deployed = true)))));


--
-- Name: POLICY "Anyone can view custom domains for public deployed chats" ON custom_domains; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Anyone can view custom domains for public deployed chats" ON public.custom_domains IS 'Allows anyone to view custom domains for public deployed chats so that visitors can see the correct URL in the deployed badge';


--
-- Name: subscriptions Can only view own subs data.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Can only view own subs data." ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users Can update own user data.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Can update own user data." ON public.users FOR UPDATE USING (true);


--
-- Name: messages Enable delete for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users only" ON public.messages FOR DELETE TO authenticated USING ((chat_id IN ( SELECT chats.id
   FROM public.chats
  WHERE (chats.user_id = auth.uid()))));


--
-- Name: chat_likes Enable delete for users based on user_id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for users based on user_id" ON public.chat_likes FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: users Enable insert access for all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all" ON public.users FOR INSERT WITH CHECK (true);


--
-- Name: customers Enable insert access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert access for all users" ON public.customers FOR INSERT WITH CHECK (true);


--
-- Name: chat_likes Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users only" ON public.chat_likes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: chats Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users only" ON public.chats FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: messages Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users only" ON public.messages FOR INSERT TO authenticated WITH CHECK ((chat_id IN ( SELECT chats.id
   FROM public.chats
  WHERE (chats.user_id = auth.uid()))));


--
-- Name: chat_likes Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.chat_likes FOR SELECT USING (true);


--
-- Name: chats Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.chats FOR SELECT USING (true);


--
-- Name: customers Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.customers FOR SELECT USING (true);


--
-- Name: users Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);


--
-- Name: messages Enable update for authenticated users only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users only" ON public.messages FOR UPDATE TO authenticated USING ((chat_id IN ( SELECT chats.id
   FROM public.chats
  WHERE (chats.user_id = auth.uid())))) WITH CHECK ((chat_id IN ( SELECT chats.id
   FROM public.chats
  WHERE (chats.user_id = auth.uid()))));


--
-- Name: chats Enable update for users based on id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for users based on id" ON public.chats FOR UPDATE TO authenticated USING (true);


--
-- Name: customers Enable update for users based on id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for users based on id" ON public.customers FOR UPDATE USING ((auth.uid() = id));


--
-- Name: extra_messages Service role can manage all extra messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all extra messages" ON public.extra_messages TO authenticated USING ((auth.uid() = user_id));


--
-- Name: generation_locks Service role has full access to generation_locks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to generation_locks" ON public.generation_locks USING (true) WITH CHECK (true);


--
-- Name: chat_integrations Users can create chat integrations for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create chat integrations for own chats" ON public.chat_integrations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_integrations.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: chat_secrets Users can create chat secrets for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create chat secrets for own chats" ON public.chat_secrets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_secrets.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: user_integrations Users can create own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own integrations" ON public.user_integrations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_secrets Users can create own secrets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own secrets" ON public.user_secrets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_integrations Users can delete chat integrations for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete chat integrations for own chats" ON public.chat_integrations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_integrations.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: chat_secrets Users can delete chat secrets for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete chat secrets for own chats" ON public.chat_secrets FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_secrets.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: messages Users can delete messages from own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete messages from own chats" ON public.messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: chats Users can delete own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own chats" ON public.chats FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: github_connections Users can delete own github connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own github connections" ON public.github_connections FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_integrations Users can delete own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own integrations" ON public.user_integrations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_secrets Users can delete own secrets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own secrets" ON public.user_secrets FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: custom_domains Users can delete their own custom domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own custom domains" ON public.custom_domains FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_files Users can delete their own files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own files" ON public.user_files FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: messages Users can insert messages to own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages to own chats" ON public.messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: chats Users can insert own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own chats" ON public.chats FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: github_connections Users can insert own github connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own github connections" ON public.github_connections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_domains Users can insert their own custom domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own custom domains" ON public.custom_domains FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_files Users can insert their own files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own files" ON public.user_files FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: token_usage_tracking Users can insert their own token usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own token usage" ON public.token_usage_tracking FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_integrations Users can update chat integrations for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update chat integrations for own chats" ON public.chat_integrations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_integrations.chat_id) AND (chats.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_integrations.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: chat_secrets Users can update chat secrets for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update chat secrets for own chats" ON public.chat_secrets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_secrets.chat_id) AND (chats.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_secrets.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: messages Users can update messages in own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages in own chats" ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: chats Users can update own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own chats" ON public.chats FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: github_connections Users can update own github connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own github connections" ON public.github_connections FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_integrations Users can update own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own integrations" ON public.user_integrations FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_secrets Users can update own secrets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own secrets" ON public.user_secrets FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_domains Users can update their own custom domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own custom domains" ON public.custom_domains FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_integrations Users can view chat integrations for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chat integrations for own chats" ON public.chat_integrations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_integrations.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: chat_secrets Users can view chat secrets for own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view chat secrets for own chats" ON public.chat_secrets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = chat_secrets.chat_id) AND (chats.user_id = auth.uid())))));


--
-- Name: messages Users can view messages from accessible chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages from accessible chats" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chats
  WHERE ((chats.id = messages.chat_id) AND ((chats.user_id = auth.uid()) OR (chats.is_private = false))))));


--
-- Name: POLICY "Users can view messages from accessible chats" ON messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can view messages from accessible chats" ON public.messages IS 'Allows users to view messages from chats they own or public chats';


--
-- Name: chats Users can view own chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own chats" ON public.chats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: POLICY "Users can view own chats" ON chats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can view own chats" ON public.chats IS 'Allows users to view all their own chats regardless of privacy setting';


--
-- Name: github_connections Users can view own github connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own github connections" ON public.github_connections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_integrations Users can view own integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own integrations" ON public.user_integrations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_secrets Users can view own secrets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own secrets" ON public.user_secrets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chats Users can view public chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view public chats" ON public.chats FOR SELECT USING ((is_private = false));


--
-- Name: POLICY "Users can view public chats" ON chats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Users can view public chats" ON public.chats IS 'Allows users to view any public chat (is_private = false)';


--
-- Name: custom_domains Users can view their own custom domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own custom domains" ON public.custom_domains FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: extra_messages Users can view their own extra messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own extra messages" ON public.extra_messages FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_files Users can view their own files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own files" ON public.user_files FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: token_usage_tracking Users can view their own token usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own token usage" ON public.token_usage_tracking FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_secrets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_secrets ENABLE ROW LEVEL SECURITY;

--
-- Name: chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: extra_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.extra_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: generation_locks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generation_locks ENABLE ROW LEVEL SECURITY;

--
-- Name: github_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: token_usage_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.token_usage_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: user_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

--
-- Name: user_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_secrets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- App-specific storage policies used by CodeRocket buckets.
CREATE POLICY "Allow authenticated users to upload" ON storage.objects FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: objects addimages 1ffg0oo_0; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "addimages 1ffg0oo_0" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'images'::text));


--
-- Name: objects addimages 1ffg0oo_1; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "addimages 1ffg0oo_1" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'images'::text));


--
-- Name: objects addimages 1ffg0oo_2; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "addimages 1ffg0oo_2" ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'images'::text));

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: objects public 1u827u6_0; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "public 1u827u6_0" ON storage.objects FOR SELECT USING ((bucket_id = 'featured'::text));


--
-- Name: objects public 6odaj1_0; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "public 6odaj1_0" ON storage.objects FOR SELECT USING ((bucket_id = 'chat-images'::text));


--
-- Name: objects public 6odaj1_1; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "public 6odaj1_1" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'chat-images'::text));


--
-- Name: objects public 6odaj1_2; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "public 6odaj1_2" ON storage.objects FOR UPDATE USING ((bucket_id = 'chat-images'::text));

