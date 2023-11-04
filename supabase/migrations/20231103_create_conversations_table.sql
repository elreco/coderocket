CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- génère automatiquement un UUID unique pour chaque chat
    user_id UUID REFERENCES users(id), -- remplacez 'users' par le nom de votre table d'utilisateurs si différent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    messages JSONB NOT NULL
);

-- Assurez-vous que l'extension 'uuid-ossp' est activée pour utiliser uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";