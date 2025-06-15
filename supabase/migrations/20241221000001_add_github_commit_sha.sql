-- Add column to track the SHA of the last commit pulled from GitHub
ALTER TABLE chats
ADD COLUMN last_github_commit_sha TEXT;