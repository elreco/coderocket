# Email support in CodeRocket

## Structure
- `template.ts` rend un layout HTML commun avec sections "highlights" et "component spotlight".
- `scenarios.ts` mappe chaque événement produit vers un sujet/corps/CTA.
- `send-email.ts` encapsule Resend et construit les payloads.
- `showcase.ts` s'appuie sur la RPC `get_components` pour récupérer les composants publics (captures incluses via `last_assistant_message`) et remplir les sections visuelles cliquables.
- `app/api/email/dispatch/route.ts` expose un endpoint interne pour déclencher un scénario.

## Configuration détaillée
1. **Variables d’environnement (local/Vercel/Supabase Functions)**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (clé service)
   - `RESEND_API_KEY`
   - `RESEND_FROM_ADDRESS`
   - `EMAIL_DISPATCH_URL` (optionnel, défaut `https://www.coderocket.app/api/email/dispatch`)
   - `EMAIL_DISPATCH_KEY` (optionnel, pour sécuriser l’endpoint Next)
2. **Resend**
   - Vérifie le domaine d’envoi et l’auth DKIM.
3. **Migration Supabase**
   - `20251117000000_add_email_tracking_to_users.sql` ajoute `last_email_scenario` / `last_email_sent_at`.
   - Local : `supabase migration up`.
   - Production : `supabase db push --project-ref <project-ref>`.
4. **Déploiement fonction Edge**
   - `supabase functions deploy email-dispatcher --project-ref <project-ref>`.
5. **Tests CLI**
   - `supabase functions invoke email-dispatcher --project-ref <project-ref> --body '{"to":"sandbox@example.com","scenario":"onboarding-welcome"}'`.

## Envoi manuel (local)
```bash
npm run dev
curl -X POST http://localhost:4002/api/email/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "to": "sandbox@example.com",
    "userId": "00000000-0000-0000-0000-000000000000",
    "scenario": "onboarding-welcome",
    "data": {
      "userName": "Alec"
    }
  }'
```

## Intégration Supabase
### Edge Function
- `supabase/functions/email-dispatcher/index.ts`
  - **Détection automatique des hooks Supabase Auth** : La fonction détecte automatiquement les payloads des hooks Auth et déclenche l'email de bienvenue sans configuration supplémentaire.
  - Payload manuel unique : `{"to": "...", "scenario": "...", "data": {...}, "userId": "..."}`
  - Payload batch : `{"recipients":[{...},{...}]}`
  - Headers ajoutés automatiquement (`Authorization: Bearer EMAIL_DISPATCH_KEY` si présent).
  - Route publique une fois déployée : `https://<project-ref>.functions.supabase.co/email-dispatcher`.

### Configuration automatique du hook Signup
1. **Signup (100% automatique)**
   - Dans Supabase Dashboard → Auth → Hooks → configure simplement l'URL de la fonction Edge.
   - **Aucun payload à configurer** : La fonction détecte automatiquement les événements `user.created` et envoie l'email de bienvenue avec le nom de l'utilisateur extrait automatiquement.
   - Le hook Supabase envoie le payload standard, la fonction fait le reste.

2. **Cron J+2 / J+5**
   - Crée un Cron (`supabase cron create onboarding-day2 '0 10 * * *' --request-body-file day2.json --url https://.../email-dispatcher`).
   - Le `day2.json` contient `{"recipients": [{"to":"...", "userId":"...", "scenario":"onboarding-tips"}]}`; génère la liste via une petite Edge Function ou un service externe qui exécute une requête SQL.
3. **Inactivité (14/30 jours)**
   - Même pattern : Cron + requête SQL pour récupérer les utilisateurs avec `last_email_sent_at`/`last_active_at`.
4. **Milestones / exports**
   - Utilise les webhooks Supabase ou des fonctions RPC pour déclencher `email-dispatcher` avec `scenario: "milestone-celebrate"`.

### Astuce SQL pour récupérer les destinataires
```sql
select email, id
from users
where last_email_scenario is distinct from 'onboarding-tips'
  and last_email_sent_at < now() - interval '2 days';
```
Transforme ce résultat en tableau `recipients` et passe-le dans la fonction.

## Brancher Supabase
- Triggers auth (`user_signed_up`) → Edge Function + `userId`.
- Jobs cron pour J+2, J+5, 14 jours, 30 jours (SQL scheduler Supabase).
- Webhooks produits (export, paiement, etc.) pour les scénarios milestone ou offre.

## Notes
- Respecte le quota Resend Free (100 emails/jour). Batch les envois si nécessaire.
- Personnalise les textes des scénarios directement dans `scenarios.ts`. Le contenu visuel (composants, highlights) est automatiquement pioché via `get_components` (is_private = false, ordonné par `created_at` avec `last_assistant_message` pour les previews).
- L’endpoint doit être appelé côté serveur (Edge Functions, cron, webhooks). Pas d’appel direct depuis le client public.
- Aucune doc publique ne doit référencer ces endpoints internes.

