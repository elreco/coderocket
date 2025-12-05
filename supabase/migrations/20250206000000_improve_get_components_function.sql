CREATE OR REPLACE FUNCTION get_chats_with_details()
RETURNS TABLE (
    chat_id uuid,
    user_id uuid,
    user_full_name text,
    user_avatar_url text,
    is_featured boolean,
    is_private boolean,
    created_at timestamp with time zone,
    slug text,
    title text,
    likes numeric,
    first_user_message text,
    last_assistant_message text,
    last_assistant_message_theme text,
    framework text,
    remix_chat_id uuid,
    views integer,
    clone_url text,
    artifact_code text,
    prompt_image text,
    input_tokens numeric,
    output_tokens numeric,
    remix_from_version numeric,
    metadata jsonb,
    github_repo_url text,
    github_repo_name text,
    last_github_sync timestamp with time zone,
    last_github_commit_sha text,
    deploy_subdomain text,
    deployed_at timestamp with time zone,
    deployed_version integer,
    is_deployed boolean,
    remixes_count bigint
)
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

