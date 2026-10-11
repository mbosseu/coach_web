# Préparation à la production

## Décision actuelle : mise en production non validée

Le code a passé la recette locale, mais les conditions ci-dessous doivent être remplies avant un déploiement. Ce document n’est pas une autorisation de publier.

- Remplacer toutes les clés et tous les mots de passe exposés dans le chat, y compris ceux des autres services. Ne pas les révoquer automatiquement depuis ce projet.
- Remplacer la clé Brevo privée locale. Retirer le marqueur `BREVO_KEY_EXPOSED` seulement après remplacement effectif.
- Faire confirmer par la direction les dates exactes de saison, les fermetures et les exceptions. Les six visuels officiels indiquent 2026–2027 mais ne constituent pas un calendrier d’annulations.
- Installer une version corrigée de Node.js LTS 24, au minimum 24.21. Le Node local de recette est 24.11.1 : le démarrage de production le refuse.
- Créer le véritable premier administrateur, contrôler les données puis activer les comptes coachs autorisés.
- Choisir un hébergement avec disque persistant, un domaine, HTTPS, un compte de service, une politique de sauvegarde externe et une supervision.
- Confirmer la réception en boîte mail du test Brevo et tester un parcours complet de préproduction avec des adresses contrôlées.
- Obtenir l’autorisation explicite de l’utilisateur avant de déployer.

## Hébergement compatible

Un processus Node.js sur un seul hôte, SQLite sur disque local persistant et un reverse proxy HTTPS. **Pas de fonction Vercel éphémère, pas de stockage réseau partagé, pas de cluster de workers ni de plusieurs instances sur la même base**. La solution convient à une application interne ; une architecture multi-instance nécessiterait une adaptation de la base et du worker de notifications.

Le serveur est configuré par défaut sur `127.0.0.1`. Ne pas l’exposer directement sur Internet. Le reverse proxy doit écraser les en-têtes clients de confiance, limiter les requêtes et conserver le nom d’hôte public.

## Variables serveur

| Variable | Valeur / règle |
|---|---|
| `NODE_ENV` | `production` après la préparation et les tests |
| `HOST` / `PORT` | `127.0.0.1` / port privé du service |
| `APP_ORIGIN` | Origine HTTPS exacte, sans chemin, ni slash final, ni identifiants |
| `DATABASE_PATH` | Chemin absolu sur disque persistant, hors racine web publique |
| `BACKUP_DIR` | Répertoire privé persistant, hors racine web |
| `TRUST_LOOPBACK_PROXY` | `true` seulement derrière un proxy local qui écrase `X-Real-IP` |
| `REGISTRATION_APPROVAL` | `true` obligatoire en production |
| `SCHEDULES_CONFIRMED` | `true` seulement après validation réelle des six plannings et exceptions |
| `MAIL_MODE` | `brevo` obligatoire en production |
| `BREVO_API_KEY` | Nouvelle clé privée active, uniquement côté serveur |
| `BREVO_KEY_EXPOSED` | Doit être absent ou `false` après la rotation effective |
| `BREVO_SENDER_EMAIL` | Expéditeur actif/vérifié dans Brevo |
| `BREVO_SENDER_NAME` | `Boxing Center` |
| `BREVO_REPLY_TO` | Adresse de réponse validée par la direction |
| `BREVO_ENV_FILE` | Optionnel : chemin privé explicitement choisi ; seules les quatre variables Brevo sont lues |

La confirmation des déclarations va au coach et à `boxingcenter31@gmail.com`, conformément au cahier des charges. Ne pas copier les clés Supabase, Resend, Cloudinary, SMTP ou les accès Deciplus de boutique : ils ne sont pas nécessaires ici.

L’exemple `.env.example` ne contient aucun secret. Le `.env` réel est ignoré par Git et interdit par le serveur HTTP. Le protéger en lecture avec les permissions du compte de service ; sous Windows, `chmod` ne remplace pas une configuration des ACL NTFS. Vérifier aussi les ACL de la base, des WAL/SHM et des sauvegardes. Ne pas inclure `.env`, les bases ou les captures privées dans une archive publique.

## Exemple de reverse proxy

Extrait de configuration Nginx à adapter, après provisionnement du certificat et du domaine. Rien n’a été installé ni publié :

```nginx
server {
    listen 443 ssl;
    server_name coachs.votre-domaine.fr;
    ssl_certificate /chemin/prive/fullchain.pem;
    ssl_certificate_key /chemin/prive/privkey.pem;
    client_max_body_size 64k;
    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Configurer séparément la redirection HTTP vers HTTPS, le serveur par défaut rejetant les autres hôtes, les restrictions du pare-feu et la supervision. Le proxy ne doit pas servir directement le dossier du projet : l’application possède une liste limitée de fichiers publics autorisés.

## Installation, migrations et premier lancement

1. Sauvegarder la version en service et sa base avant toute mise à jour.
2. Installer Node LTS corrigé et les dépendances avec `npm ci`. Le module SQLite utilise un binaire natif : valider la compatibilité de l’hôte cible.
3. Préparer les variables privées, en mode développement pour le bootstrap. Créer l’administrateur avec `npm run admin:create` et des saisies masquées (README).
4. Vérifier les six plannings, les cours des enfants en été, les congés et les jours fériés. L’expansion actuelle couvre le 01/09/2026–31/08/2027 : cette borne reste une hypothèse technique, pas une confirmation métier.
5. Exécuter `npm run check`, `npm test` et `npm audit --omit=dev` sur l’hôte cible. Les tests API utilisent des bases isolées et un Brevo simulé, jamais la clé réelle.
6. Mettre les variables de production conformes, créer une sauvegarde et démarrer une seule instance avec `npm start` sous un service supervisé.
7. Contrôler `/api/health`, HTTPS, les cookies `Secure`, l’origine/CSRF, les refus d’accès, les inscriptions en attente et l’envoi/réception réels en préproduction.

Les migrations SQLite 1 et 2 sont appliquées automatiquement et sans suppression de données. La migration 2 ajoute l’expiration des notifications de récupération d’accès. Il n’existe pas de migration automatique des données localStorage du prototype.

Le serveur refuse notamment HTTP en production, l’absence d’administrateur, une clé signalée exposée, l’absence de Brevo, l’absence de confirmation des plannings et un Node local trop ancien. Ces vérifications ne remplacent pas une validation de l’infrastructure ni un audit de sécurité externe.

## Notifications et exploitation

La validation définitive et la création des notifications sont enregistrées dans la même transaction. Deux messages distincts sont mis en file. Un worker traite la file durable, avec délai pour les erreurs 429/503. Une réponse réseau inconnue ou un arrêt pendant l’envoi place le message **à vérifier**, sans renvoi automatique susceptible de doubler un envoi.

La direction voit les états dans **Notifications**. Avant une reprise manuelle, elle doit vérifier dans Brevo l’absence du message et renseigner un motif. L’action est journalisée. L’idempotence du prestataire a une durée limitée : ce mécanisme ne promet pas un « exactement une fois » universel. Le statut **Accepté par Brevo** n’atteste pas la réception dans la boîte mail ; les webhooks de livraison/rebond ne sont pas implémentés.

Les tokens de récupération sont à usage unique, valables 30 minutes, stockés sous forme de hash dans la table de validation. Le message en attente contient nécessairement le lien avant envoi ; ce contenu est effacé après acceptation, consommation, annulation ou expiration. Une suspension ou un changement de mot de passe invalide les liens et annule les notifications encore en attente.

Un unique test réel a été autorisé et accepté le 11/10/2026. `scripts/test-mail.cjs --confirmed-direction-test` conserve son résultat dans une base séparée et refuse de répéter automatiquement ce test. Ne pas supprimer cette trace pour forcer un nouvel envoi.

## Sauvegarde, restauration et surveillance

Une sauvegarde vérifiée par `integrity_check` est créée au démarrage de production, puis toutes les 24 heures. `npm run backup` permet une sauvegarde manuelle. `VACUUM INTO` produit une copie cohérente : ne pas copier seulement le fichier principal pendant que WAL est actif.

Les sauvegardes locales ne couvrent pas la perte de l’hôte. Définir une rétention, des copies chiffrées hors site, une surveillance de l’espace disque et des échecs, ainsi qu’un exercice régulier de restauration. Aucune suppression automatique de sauvegardes n’a été ajoutée.

Restauration : arrêter le service, exécuter `node scripts/restore.cjs SOURCE NOUVELLE_DESTINATION`, contrôler la base restaurée, ajuster `DATABASE_PATH`, puis redémarrer. Le script refuse d’écraser une destination ou ses fichiers WAL/SHM existants. Préserver l’ancienne base pour un retour arrière contrôlé.

Surveiller disponibilité, disque, croissance des bases/journaux, sauvegardes, réponses 429/5xx et notifications `failed`/`uncertain`. Aucun outil externe de monitoring n’a été provisionné. SQLite n’est pas chiffré par cette application : chiffrer le volume et les sauvegardes selon la politique de protection des coordonnées professionnelles.
