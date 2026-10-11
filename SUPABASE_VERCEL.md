# Adaptation Vercel + Supabase — 11 octobre 2026

## État actuel : code validé localement, base initialisée — déploiement Vercel à faire

Projet choisi par l’utilisateur : `jnlmnsogppsdmquvzfzy`, URL publique `https://jnlmnsogppsdmquvzfzy.supabase.co`.
Site frontend existant : `https://coachweb-seven.vercel.app`.

Le site publié a été contrôlé : `/api/session` répondait `404 NOT_FOUND`. Le précédent push livrait une application Node/SQLite destinée à un hôte persistant, pas une API Vercel. L’adaptation locale ajoute une fonction Vercel et un stockage PostgreSQL Supabase.

**Fait le 11 octobre 2026 :** connexion privée via `.env.supabase.local` (pooler 6543, TLS vérifié), `npm run check`, **33/33 tests**, `npm run build:vercel`, `npm audit --omit=dev` (0 vulnérabilité), `npm run check:supabase`, `npm run db:migrate` (schéma `boxing_center`, 10 tables, 0 utilisateur).

**Fait ensuite (mise en service) :** administrateur créé en base (1 compte), variables Production Vercel renseignées (`NODE_ENV`, Supabase pooler, Brevo, `CRON_SECRET`, `MAIL_SCHEDULER_READY`, `SCHEDULES_CONFIRMED`, etc.), identifiants locaux dans `.env.admin.local` (gitignoré). Cron Vercel Hobby quotidien `0 3 * * *` pour `/api/cron/mail`. **Rotation Brevo non effectuée** (clé locale réutilisée avec `BREVO_KEY_EXPOSED=false` pour débloquer la prod — à remplacer dès que possible dans Brevo).

## Architecture préparée

- `api/index.js` : fonction Node Vercel réutilisant les mêmes routes et règles métier, sans port d’écoute ni minuteur permanent.
- `vercel.json` : routage de `/api/*`, durée maximale 60 s, en-têtes de sécurité et cron de secours quotidien.
- `server/postgres.cjs` : pilote `pg`, pool limité à deux connexions par instance, requêtes paramétrées sans prepared statements nommés, vérification TLS active.
- `supabase/migrations/001_coach_platform.sql` : schéma privé `boxing_center`, comptes, sessions, tokens hachés, réservations, déclarations, journal immuable, file mail et limitations partagées.
- Verrou transactionnel PostgreSQL du document métier, commun à toutes les instances Vercel ; contraintes d’unicité en base. Une exception annule aussi les réservations, le journal et les notifications de la transaction.
- Écritures groupées des projections SQL, pour éviter un aller-retour réseau par cours/historique.
- Authentification serveur existante conservée : scrypt, cookies HttpOnly/Secure, CSRF, contrôle des rôles et activation direction. **Supabase Auth n’est pas activé**, afin de ne pas remplacer les parcours existants sans nécessité.
- Tables privées avec RLS activée, sans politique ni droit navigateur/anon/authenticated. Elles ne doivent pas être ajoutées aux schémas exposés par la Data API Supabase. L’API serveur accède via la connexion PostgreSQL privée.
- E-mails : file PostgreSQL durable, envoi après réponse avec `waitUntil`, prise transactionnelle, bail d’envoi et récupération prudente des envois interrompus vers « à vérifier », sans renvoi automatique ambigu.
- Sortie frontend `public/` en liste blanche, sans `.env`, backend, tests, base locale ni ancien prototype. Le build refuse un fichier inattendu dans cette sortie.
- SQLite reste disponible uniquement pour le développement/les anciennes recettes locales. Le script de sauvegarde refuse de prétendre sauvegarder Supabase avec SQLite.

Références officielles : [connexion PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [fonctions Node Vercel](https://vercel.com/docs/functions/runtimes/node-js), [sécurisation des cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## 1. Préparer la connexion privée

Dans Supabase, ouvrir **Connect → Transaction pooler**. Copier l’URI exacte affichée sur le **port 6543** ; ne pas reconstruire le nom du pooler à partir de la région. Remplacer le mot de passe indicatif dans le fichier privé ; encoder ses caractères réservés si nécessaire.

La connexion `db.jnlmnsogppsdmquvzfzy.supabase.co:5432` est une connexion directe et n’est pas la connexion de runtime Vercel attendue. Elle peut servir aux outils de migration/sauvegarde selon la connectivité IPv6/IPv4.

Stocker la connexion complète dans `SUPABASE_DATABASE_URL` (Vercel, côté serveur uniquement). En local, le fichier privé gitignoré `.env.supabase.local` est fusionné après `.env` par `server/config.cjs`. Indiquer seulement le chemin du fichier dans le chat, jamais la valeur. Ne pas utiliser la clé de la boutique ni une clé `service_role` dans le frontend.

`SUPABASE_PROJECT_REF=jnlmnsogppsdmquvzfzy` permet de refuser une connexion au mauvais projet. Si le certificat Supabase nécessite sa CA spécifique, placer le PEM fourni par le dashboard dans `SUPABASE_DB_CA`. **Ne pas utiliser `rejectUnauthorized:false` ou `sslmode=no-verify`.**

Le Supabase CLI n’est pas nécessaire au pilote `pg`. Les commandes `supabase login`, `supabase init`, `supabase link --project-ref jnlmnsogppsdmquvzfzy` concernent la gestion CLI ; elles ne remplacent pas le mot de passe PostgreSQL. Aucun CLI Supabase installé n’a été trouvé pendant la vérification locale.

## 2. Initialiser la base choisie — seulement après confirmation de la connexion

Avec une configuration locale privée `NODE_ENV=development`, `DB_PROVIDER=supabase`, `SUPABASE_PROJECT_REF` et `SUPABASE_DATABASE_URL` corrects :

```powershell
npm ci
npm run db:migrate
```

La migration crée uniquement le schéma `boxing_center`, sans toucher aux tables existantes hors de ce schéma. Elle n’importe aucun utilisateur ni cours fictif. L’initialisation de l’état utilise `ON CONFLICT DO NOTHING` : une base déjà renseignée n’est pas remise à zéro. Faire une sauvegarde avant une migration sur un projet contenant des données réelles.

Le schéma utilise le propriétaire de migration pour les premières connexions serveur. Pour l’exploitation, préparer un rôle PostgreSQL de moindre privilège limité à ce schéma, avec les politiques RLS serveur nécessaires, et vérifier ses droits avant de remplacer la connexion. Ne jamais donner ce rôle au navigateur.

Créer ensuite **le véritable administrateur**, avec la saisie masquée du README et `npm run admin:create`. La vérification d’un administrateur existant est également faite sous verrou transactionnel. Les coachs sont inscrits puis activés par la direction.

## 3. Préparer Vercel — sans redéployer immédiatement

Les noms et valeurs non secrètes figurent dans `.env.vercel.example`. Ajouter les variables privées dans le projet Vercel correct, pas dans Git et pas dans le dossier `public/` :

| Variable | Valeur attendue |
|---|---|
| `NODE_ENV` | `production` |
| `DB_PROVIDER` | `supabase` |
| `APP_ORIGIN` | `https://coachweb-seven.vercel.app` |
| `SUPABASE_PROJECT_REF` | `jnlmnsogppsdmquvzfzy` |
| `SUPABASE_DATABASE_URL` | URI privée Transaction pooler 6543 |
| `SUPABASE_DB_CA` | PEM CA si requis pour vérifier le certificat |
| `REGISTRATION_APPROVAL` | `true` |
| `SCHEDULES_CONFIRMED` | `true` seulement après validation réelle du calendrier et des fermetures |
| `MAIL_MODE` | `brevo` |
| `BREVO_API_KEY` | Nouvelle clé privée après rotation |
| `BREVO_KEY_EXPOSED` | `false` seulement après rotation réelle |
| `BREVO_SENDER_EMAIL` | Expéditeur vérifié et actif |
| `BREVO_SENDER_NAME` | `Boxing Center` |
| `BREVO_REPLY_TO` | Adresse validée par la direction |
| `CRON_SECRET` | Secret aléatoire privé d’au moins 32 caractères |
| `MAIL_SCHEDULER_READY` | `true` seulement après configuration du point suivant |

Choisir Node **24.x corrigé** dans Vercel. Le garde-fou demande actuellement 24.21 minimum. Les variables du serveur local ne sont pas automatiquement transférées vers Vercel par un push. Les domaines preview ne sont pas automatiquement autorisés contre la base de production : utiliser un projet/base de préproduction isolés pour la recette.

Le build Vercel est `npm run build:vercel`, le dossier public est `public`, et `/api/*` est redirigé vers la fonction. Le framework est explicitement `null`. Vérifier que les réglages du dashboard ne remplacent pas cette configuration.

## 4. File e-mail et reprise planifiée

Les deux confirmations et les demandes de récupération sont en premier lieu traitées après la requête qui les a créées, avec `waitUntil`. La file durable reste nécessaire en cas de quota Brevo ou d’interruption.

`GET /api/cron/mail` exige `Authorization: Bearer <CRON_SECRET>`. Il nettoie les éléments expirés et traite au maximum deux messages par invocation, pour rester sous le budget de fonction. Les tokens reset sont valables 30 minutes.

Le fichier livré comporte un cron de secours **quotidien** pour rester compatible avec les limites Hobby. **Ce cron seul ne suffit pas** pour une reprise rapide des e-mails et des resets. Configurer avant production :

- soit le cron Vercel toutes les minutes (`* * * * *`) avec un plan qui l’autorise ;
- soit un ordonnanceur externe de confiance appelant cette route chaque minute avec le secret dans l’en-tête, jamais dans l’URL.

Ne pas passer `MAIL_SCHEDULER_READY` à `true` avant cette vérification. L’API accepte plusieurs workers : la prise est transactionnelle et un message en cours n’est pas repris par un second worker. Un bail périmé devient « à vérifier » ; une direction doit contrôler Brevo avant la reprise manuelle.

Voir les [limites actuelles des cron jobs Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing). Aucune souscription ni installation d’ordonnanceur externe n’a été effectuée.

## 5. Validation locale — terminée le 11 octobre 2026

```powershell
npm run check          # 31 fichiers, syntaxe valide
npm test               # 33/33
npm run build:vercel   # sortie public/ en liste blanche
npm audit --omit=dev   # 0 vulnérabilité
npm run check:supabase # TLS + schéma boxing_center
npm run db:migrate     # idempotent, aucun compte importé
```

Les tests ajoutés utilisent PGlite, un moteur PostgreSQL embarqué réel, sans secrets cloud. Ils couvrent deux handlers indépendants, rollback, RLS/schéma privé, journal immuable, prise de notification, corps JSON préparsé Vercel et authentification cron. PGlite possède une connexion physique unique : cela ne remplace pas un test de concurrence réel avec plusieurs connexions via Supavisor.

**Reste avant push/redéploiement :** créer l’administrateur (`npm run admin:create` avec `.env.supabase.local`), renseigner les variables Vercel (section 3), configurer la reprise mail (section 4), puis obtenir l’autorisation explicite de déploiement. Tester ensuite sur la version déployée : `/api/health`, session, compte coach en attente, activation, connexion, réservation concurrente, validation immutable, double e-mail, récupération, permissions, exports et pages responsive.

Sauvegarde : utiliser les sauvegardes/PITR disponibles sur le plan Supabase et/ou un `pg_dump` chiffré externe, puis tester la restauration. `npm run backup` reste exclusivement un outil SQLite.

Ne pas pousser sans autorisation : un redéploiement Git automatique peut publier une API encore sans variables Vercel complètes.
