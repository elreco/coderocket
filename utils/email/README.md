# Prise en charge des e-mails dans CodeRocket

## Vue d'ensemble du système
- `template.ts` génère la mise en page HTML partagée avec les highlights et le composant vedette.
- `scenarios.ts` associe chaque événement produit aux métadonnées sujet/corps/CTA.
- `send-email.ts` gère les identifiants Resend et construit la charge utile finale.
- `showcase.ts` récupère les composants publics via la RPC `get_components` pour alimenter les cartes visuelles.
- `app/api/email/dispatch/route.ts` est l'API interne appelée par la file Postgres, les segments et les cron jobs.

## Transactionnel vs Marketing
| Aspect | Transactionnel (événements produit) | Marketing (campagnes) |
| --- | --- | --- |
| Scénarios typiques | bienvenue signup, rappel mot de passe, export prêt, facturation | onboarding J+2/J+5, relance inactivité, offres étapes |
| Déclencheur | Action utilisateur unique, appel synchrone depuis un hook ou une RPC Supabase | Liste batchée construite via SQL, cron job ou outil marketing |
| Contraintes légales | Autorisé sans consentement mais limité aux infos critiques produit | Requiert opt-in et lien de désinscription; utiliser les variantes `scenario` dédiées marketing |
| Cible de livraison | Via `app/api/email/dispatch` (file `email_jobs` ou appel direct) | Via `app/api/email/segments` qui fan-out sur `email/dispatch` |
| Domaine d'envoi | Domaine transactionnel principal (ex. `team@coderocket.app`) | Recommandé de créer `marketing@notify.coderocket.app` ou similaire pour protéger la réputation |

Le contenu des scénarios reste en anglais dans `scenarios.ts`. Pour une version marketing avec hero ou CTA différent, dupliquez la clé avec le suffixe `-promo` et injectez les données adaptées.

## Checklist de configuration
1. **Variables d'environnement**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_ADDRESS`
2. **Configuration Resend**
   - Vérifier le domaine transactionnel et les enregistrements DNS.
   - Ajouter un second domaine (ou sous-domaine) si le marketing dépasse 500 emails/jour.
   - Activer des IP dédiées uniquement une fois la limite du pool partagé dépassée régulièrement.
3. **Migration Supabase**
   - Appliquer `20251117000000_add_email_tracking_to_users.sql` en local via `supabase migration up`.
   - Pousser en production avec `supabase db push --project-ref <project-ref>`.
4. **Accès serveur**
   - Les routes `/api/email/*` doivent être appelées uniquement depuis un cron serveur (Supabase ou Vercel) ou un job interne.

## Guide de mise en production
1. **Dry run**
   - Appeler le dispatcher local pendant `npm run dev`.
   - Utiliser des destinataires sandbox jusqu'à ce que layout et pixels de tracking soient validés.
2. **Parcours transactionnels**
   - Le trigger `handle_new_user` en base ajoute automatiquement un job `onboarding-welcome` dans `email_jobs` dès qu'un compte est créé.
   - Planifier un cron (Supabase ou Vercel) qui appelle `POST /api/email/jobs/process` toutes les minutes pour vider la file.
   - Vérifier la file (`select * from email_jobs order by created_at desc`) et l'activité Resend.
3. **Parcours marketing**
   - Exemple : `supabase cron create onboarding-day2 '0 10 * * *' --request-body '{ "segment": "onboarding-day2" }' --url https://www.coderocket.app/api/email/segments`
   - `<nom>` = nom du cron (ex: `onboarding-day2`, `reactivation-14d`)
   - `<cron>` = expression cron (ex: `'0 10 * * *'` = tous les jours à 10h, `'0 */6 * * *'` = toutes les 6h)
   - `<segment>` = un des segments disponibles (voir section "Segments disponibles" ci-dessous)
   - Ajuster les segments ou la limite via le payload JSON, puis répartir les gros batches (jusqu’à 10k utilisateurs) sur plusieurs crons pour respecter Resend.
4. **Observabilité**
   - Suivre `last_email_scenario` et `last_email_sent_at` dans Supabase pour éviter les doublons.
   - Mesurer ouvertures/clics via Resend; exporter des CSV si besoin d'audit marketing.
5. **Hardening**
   - Restreindre `app/api/email/dispatch/route.ts` aux contextes serveur à serveur via pare-feu, Vercel cron, ou middleware.
   - Limiter les IP autorisées (ex. via Vercel Firewall ou Cloudflare) pour éviter qu’un client public ne déclenche les routes `/api/email/*`.

## File d'attente Postgres
- La table `public.email_jobs` stocke chaque envoi à effectuer avec son statut, le nombre de tentatives et la fenêtre de retry.
- Le trigger `handle_new_user` insère automatiquement un job `onboarding-welcome` sans utiliser les hooks Auth (pas de coût supplémentaire ni de feature beta).
- L'endpoint `POST /api/email/jobs/process` lit les jobs `pending`, envoie via Resend et met à jour `last_email_*`.
- Configurez un cron Supabase ou Vercel pour appeler `https://www.coderocket.app/api/email/jobs/process` (payload `{"limit":200}`) afin de vider la file en continu; restreignez cette route via firewall ou cron dédié.

## Segments automatiques
- `POST /api/email/segments` sélectionne automatiquement les utilisateurs éligibles depuis la base (10 000 utilisateurs aujourd’hui), applique les fenêtres temporelles et envoie le scénario associé via Resend.
- `limit` est optionnel (par défaut 500, maximum 1000 par appel). Chaînez plusieurs crons pour écouler les gros volumes.
- `scenarioOverride` force un scénario différent tout en conservant la même cohorte.
- Restreignez l'accès à cette route (cron privé, Vercel firewall) pour éviter qu’un client public ne déclenche les campagnes.

### Segments disponibles
| Segment | Description | Scénario par défaut |
| --- | --- | --- |
| `onboarding-day2` | Comptes créés il y a 2-3 jours | `onboarding-tips` |
| `onboarding-day5` | Comptes créés il y a 5-6 jours | `onboarding-challenge` |
| `reactivation-14d` | Comptes âgés de 14+ jours sans email récent | `reactivation-soft` |
| `reactivation-30d` | Comptes âgés de 30+ jours sans email récent | `reactivation-offer` |
| `weekly-pulse` | Utilisateurs sans pulse depuis 7 jours | `weekly-pulse` |

## Déclenchement manuel (local)
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

```bash
curl -X POST https://www.coderocket.app/api/email/segments \
  -H "Content-Type: application/json" \
  -d '{
    "segment": "reactivation-14d",
    "limit": 500
  }'
```

```bash
curl -X POST https://www.coderocket.app/api/email/jobs/process \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 200
  }'
```

## Modèles d'intégration Supabase
- Texte direct : `{"to":"...","userId":"...","scenario":"...","data":{...}}` via `POST /api/email/dispatch`.
- Segments automatiques : `{"segment":"reactivation-14d","limit":500}` ou ajouter `"dryRun":true` pour prévisualiser.
- File d'attente : `{"limit":200}` sur `POST /api/email/jobs/process` pour consommer la file depuis un cron.

### Trigger signup
1. La migration `20251121093000_create_email_jobs.sql` installe `handle_new_user` et la file `email_jobs`.
2. Aucun paramétrage dans Supabase Auth → Hooks n'est requis, le trigger se déclenche directement sur `auth.users`.
3. Vérifiez `email_jobs` pour confirmer l'ajout du job `onboarding-welcome`, puis laissez `/api/email/jobs/process` l'exécuter via cron.

### Configuration complète des crons

#### 1. Traitement de la file d'attente (transactionnel)
Traitement des emails de bienvenue automatiquement ajoutés par le trigger `handle_new_user` :
```bash
supabase cron create process-email-jobs '*/5 * * * *' \
  --request-body '{ "limit": 200 }' \
  --url https://www.coderocket.app/api/email/jobs/process
```
Exécution toutes les 5 minutes pour vider la file `email_jobs`.

#### 2. Onboarding J+2
Email de tips envoyé aux utilisateurs créés il y a 2-3 jours :
```bash
supabase cron create onboarding-day2 '0 10 * * *' \
  --request-body '{ "segment": "onboarding-day2" }' \
  --url https://www.coderocket.app/api/email/segments
```
Exécution tous les jours à 10h.

#### 3. Onboarding J+5
Email de challenge envoyé aux utilisateurs créés il y a 5-6 jours :
```bash
supabase cron create onboarding-day5 '0 10 * * *' \
  --request-body '{ "segment": "onboarding-day5" }' \
  --url https://www.coderocket.app/api/email/segments
```
Exécution tous les jours à 10h.

#### 4. Réactivation douce (14 jours)
Relance pour les comptes inactifs depuis 14+ jours :
```bash
supabase cron create reactivation-14d '0 9 * * 1' \
  --request-body '{ "segment": "reactivation-14d" }' \
  --url https://www.coderocket.app/api/email/segments
```
Exécution chaque lundi à 9h.

#### 5. Réactivation avec offre (30 jours)
Offre spéciale pour les comptes inactifs depuis 30+ jours :
```bash
supabase cron create reactivation-30d '0 9 * * 1' \
  --request-body '{ "segment": "reactivation-30d" }' \
  --url https://www.coderocket.app/api/email/segments
```
Exécution chaque lundi à 9h.

#### 6. Pulse hebdomadaire
Newsletter hebdomadaire pour tous les utilisateurs actifs :
```bash
supabase cron create weekly-pulse '0 8 * * 1' \
  --request-body '{ "segment": "weekly-pulse" }' \
  --url https://www.coderocket.app/api/email/segments
```
Exécution chaque lundi à 8h.

### Notes sur les crons
- Ajustez les horaires (`'0 10 * * *'`) selon votre fuseau horaire et vos préférences.
- Pour limiter le volume par exécution, ajoutez `"limit": 500` dans le `--request-body`.
- Surveillez les quotas Resend (100/jour en free tier) et répartissez les envois si nécessaire.

### Helper SQL
```sql
select email, id
from users
where last_email_scenario is distinct from 'onboarding-tips'
  and last_email_sent_at < now() - interval '2 days';
```
Ce helper reste utile pour analyser les cohortes ou vérifier les critères de segments, mais l’endpoint `api/email/segments` gère automatiquement la sélection et l’envoi.

## Notes supplémentaires
- Le free tier Resend autorise 100 messages/jour; découpez les envois marketing via plusieurs cron pour rester sous le quota.
- Les textes de scénarios se trouvent dans `scenarios.ts`; highlights et composant vedette dans `showcase.ts` alimenté par les créations publiques.
- Le dispatcher doit uniquement être appelé depuis des runtimes serveur (cron Vercel, Supabase scheduled jobs, server actions). Ne jamais l'exposer côté client; utilisez un firewall/IP allowlist.
- Gardez les URL internes confidentielles afin de protéger les endpoints d'automatisation.

