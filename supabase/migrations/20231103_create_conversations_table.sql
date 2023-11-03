-- supabase/migrations/20231103_create_conversations_table.sql

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    prompt TEXT NOT NULL,
    conversation JSON NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
