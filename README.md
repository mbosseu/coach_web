# Boxing Center — validation des heures coachs

Application frontend + API Node.js. **Cible choisie : Vercel + PostgreSQL Supabase**, projet `jnlmnsogppsdmquvzfzy`. Recette locale et initialisation du schéma `boxing_center` terminées : voir [SUPABASE_VERCEL.md](C:/Users/PC/Desktop/coach_web/SUPABASE_VERCEL.md). Le déploiement Vercel (variables, admin, cron mail) reste à faire. SQLite reste disponible sans `.env.supabase.local`. Les permissions sont gérées par le serveur, pas par le stockage du navigateur.

Recette Node/SQLite antérieure : [AUDIT_PRODUCTION.md](C:/Users/PC/Desktop/coach_web/AUDIT_PRODUCTION.md). Ancien hébergement persistant : [PRODUCTION.md](C:/Users/PC/Desktop/coach_web/PRODUCTION.md).

## Démarrage local

Depuis `C:\Users\PC\Desktop\coach_web` :

```powershell
npm ci
npm run check
npm test
npm start
```

Ouvrir [l’application locale](http://127.0.0.1:4173/). Le serveur reste sur la boucle locale. Il n’existe aucun compte administrateur par défaut. `.env` configure SQLite/Brevo local ; `.env.supabase.local` (gitignoré) active PostgreSQL Supabase lorsqu’il est présent. Ne jamais partager ni versionner ces fichiers. `.env.example` contient uniquement les noms des variables.

La clé Brevo fournie a été conservée temporairement à la demande de l’utilisateur, dans `.env` uniquement, avec des permissions Windows restreintes. Elle a été publiée dans le chat : **la remplacer avant la production**. Le garde-fou `BREVO_KEY_EXPOSED=true` empêche le démarrage en mode production tant que cette situation n’est pas résolue. Aucune autre clé de boutique n’est utilisée ici.

## Premier administrateur

Créer le compte sur la base principale, avant la mise en production. La saisie masquée suivante évite de placer le mot de passe dans l’historique du terminal :

```powershell
$env:ADMIN_EMAIL = Read-Host 'Adresse de la direction'
$env:ADMIN_PHONE = Read-Host 'Téléphone de la direction'
$bootstrapPassword = Read-Host 'Mot de passe unique (12 caractères minimum)' -AsSecureString
try {
  $env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $bootstrapPassword).Password
  npm run admin:create
} finally {
  Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_PHONE -ErrorAction SilentlyContinue
  $bootstrapPassword.Dispose()
}
```

Le script refuse de créer un deuxième administrateur. Les coachs s’inscrivent depuis l’interface ; la direction active leurs comptes dans **Coachs**. Aucun mot de passe réel ne doit être envoyé dans le chat.

## Recette isolée

```powershell
node scripts/qa-server.cjs
```

Ouvrir [la recette locale](http://127.0.0.1:4180/). Les trois comptes de recette sont `coach@recette.example.test`, `second@recette.example.test` et `direction@recette.example.test`. Leur mot de passe **de test seulement** est `Recette-Boxing-2026!`. Le compte direction utilise le formulaire « Ouvrir l’espace direction ».

Cette recette utilise `output/tests/recette-api.sqlite`, désactive toujours les e-mails et ne se charge jamais dans le serveur principal. Ne pas copier cette base en production. Des créneaux explicitement nommés « recette » y ont été créés pour tester l’administration.

## Architecture

| Fichier / dossier | Responsabilité |
|---|---|
| `schedule-data.js` | Six plannings officiels transcrits, quatre clubs, catégories et sources |
| `model.js` | Calendrier, durées, sélection, panier, validation et corrections |
| `frontend.js` | Vues, navigation, formulaires et appels API avec CSRF |
| `export-utils.js` | Export Excel XLSX natif, sans bibliothèque cliente |
| `server/app.cjs` | API, permissions, filtration des données et fichiers publics autorisés |
| `server/auth.cjs` | Scrypt, sessions, validation des profils et tokens |
| `server/store.cjs` | SQLite, migrations, transactions, journal et file de notifications |
| `server/postgres.cjs` | PostgreSQL Supabase, pool TLS et transactions inter-instances |
| `api/index.js` | Point d’entrée Vercel des mêmes routes API |
| `supabase/migrations/` | Schéma PostgreSQL privé, sans données fictives |
| `server/mail.cjs` | Brevo REST, récapitulatifs, états d’envoi et reprises contrôlées |
| `scripts/` | Démarrage, administration initiale, sauvegarde, restauration et recette |
| `tests/` | Tests du modèle, de l’API, des e-mails simulés et du XLSX |

Les dépendances serveur `pg` et `@vercel/functions` sont verrouillées dans le lockfile. `better-sqlite3` est optionnelle pour le mode local ; PGlite sert uniquement aux tests. Pas de compilation frontend : le build Vercel copie les fichiers autorisés dans `public/`. `app.js` est un ancien prototype conservé mais non chargé et non publié.

Les anciennes données locales du prototype sont conservées dans le navigateur, mais ne sont pas importées automatiquement : elles peuvent contenir des comptes et cours fictifs. Une reprise de données réelles demanderait un import contrôlé, après validation de la direction.

## Sauvegarde

```powershell
npm run backup
node scripts/restore.cjs 'CHEMIN_SAUVEGARDE.sqlite' 'NOUVELLE_BASE.sqlite'
```

La restauration ne remplace jamais une base existante. Arrêter le service, restaurer vers un nouveau chemin, vérifier les données, puis ajuster `DATABASE_PATH`. Voir le guide de production pour les sauvegardes externes, la protection des fichiers et les limites de déploiement.
