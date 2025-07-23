# GitHub Integration Setup

This documentation explains how to configure GitHub integration to allow users to sync their components with GitHub repositories.

## GitHub OAuth App Configuration

1. **Create a GitHub OAuth App**:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in the information:
     - **Application name**: `CodeRocket - Component Sync`
     - **Homepage URL**: `https://www.coderocket.app`
     - **Authorization callback URL**: `https://www.coderocket.app/api/github/callback`

2. **Get the credentials**:
   - Note the `Client ID` and generate a `Client Secret`

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Site URL (should already exist)
NEXT_PUBLIC_SITE_URL=https://www.coderocket.app
```

## Database Migration

Run the migration to create the `github_connections` table:

```bash
# If using Supabase CLI
supabase migration up

# Or manually apply the file:
# supabase/migrations/20241220000000_add_github_connections.sql
```

## GitHub Permissions

The application requests these permissions during connection:
- `repo`: Read/write access to public and private repositories
- `user:email`: Access to email address (for identification)

## Authentication Flow

1. **Connection**: User clicks "Connect GitHub" in `/account`
2. **Redirection**: To GitHub OAuth with required permissions
3. **Callback**: GitHub redirects to `/api/github/callback`
4. **Storage**: Token is stored in the `github_connections` table
5. **Confirmation**: Redirect to `/account` with success message

## Security

⚠️ **Important**: In production, GitHub tokens must be encrypted before database storage.

## Usage

Once GitHub is connected, users can:
- See their connected GitHub username
- Disconnect from GitHub
- Access future synchronization features

## Troubleshooting

### Common Errors

- `invalid_state`: Security issue, user must reconnect
- `access_denied`: User denied permissions
- `oauth_failed`: General error, check credentials

### Debug

Errors are logged server-side and displayed to users via toasts.