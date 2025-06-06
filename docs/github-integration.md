# GitHub Integration Setup

Cette documentation explique comment configurer l'intégration GitHub pour permettre aux utilisateurs de synchroniser leurs composants avec des repos GitHub.

## Configuration GitHub OAuth App

1. **Créer une GitHub OAuth App** :
   - Aller sur https://github.com/settings/developers
   - Cliquer sur "New OAuth App"
   - Remplir les informations :
     - **Application name**: `CodeRocket - Component Sync`
     - **Homepage URL**: `https://www.coderocket.app`
     - **Authorization callback URL**: `https://www.coderocket.app/api/github/callback`

2. **Récupérer les credentials** :
   - Noter le `Client ID` et générer un `Client Secret`

## Variables d'environnement

Ajouter ces variables à votre fichier `.env.local` :

```bash
# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Site URL (déjà existant normalement)
NEXT_PUBLIC_SITE_URL=https://www.coderocket.app
```

## Migration de base de données

Exécuter la migration pour créer la table `github_connections` :

```bash
# Si vous utilisez Supabase CLI
supabase migration up

# Ou appliquer manuellement le fichier :
# supabase/migrations/20241220000000_add_github_connections.sql
```

## Permissions GitHub

L'application demande ces permissions lors de la connexion :
- `repo` : Accès en lecture/écriture aux repositories publics et privés
- `user:email` : Accès à l'adresse email (pour identification)

## Flux d'authentification

1. **Connexion** : L'utilisateur clique sur "Connect GitHub" dans `/account`
2. **Redirection** : Vers GitHub OAuth avec les permissions nécessaires
3. **Callback** : GitHub redirige vers `/api/github/callback`
4. **Stockage** : Le token est stocké dans la table `github_connections`
5. **Confirmation** : Redirection vers `/account` avec message de succès

## Sécurité

⚠️ **Important** : En production, les tokens GitHub doivent être chiffrés avant stockage en base.

## Utilisation

Une fois GitHub connecté, les utilisateurs peuvent :
- Voir leur nom d'utilisateur GitHub connecté
- Se déconnecter de GitHub
- Accéder aux futures fonctionnalités de synchronisation

## Troubleshooting

### Erreurs communes

- `invalid_state` : Problème de sécurité, l'utilisateur doit reconnecter
- `access_denied` : L'utilisateur a refusé les permissions
- `oauth_failed` : Erreur générale, vérifier les credentials

### Debug

Les erreurs sont loggées côté serveur et affichées à l'utilisateur via des toasts.