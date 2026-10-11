# Audit et recette Boxing Center — 11 octobre 2026

## Conclusion

Le projet n’est plus uniquement une maquette : il dispose maintenant d’une API, d’une base SQLite partagée, d’une authentification serveur, de permissions, d’une file Brevo durable et de sauvegardes. Les parcours coach et direction ont été testés. **La mise en production reste à autoriser et à préparer**, notamment pour la rotation des secrets exposés, la confirmation du calendrier de saison, le bootstrap du véritable administrateur, Node LTS corrigé et l’infrastructure HTTPS.

Le cahier des charges PDF a été lu intégralement : 12 pages, 21 sections. Les anciennes analyses décrivent le prototype à leur date ; le présent rapport les remplace pour l’état actuel. La DA claire/marine, avec violet discret, suit les instructions utilisateur postérieures au PDF.

## Principaux défauts constatés et corrections

| Défaut initial | Correction effective | Vérification |
|---|---|---|
| Maquette localStorage sans backend ni base commune | API Node et SQLite persistante ; aucune confiance dans le rôle fourni par le client | Tests HTTP de permissions, persistance et deux utilisateurs concurrents |
| Authentification locale et accès direction non sécurisable | Mots de passe scrypt salés, sessions HttpOnly, CSRF, origine/hôte stricts, expiration, limitation de tentatives | Connexion navigateur ; tests de cookies, expiration, changement de mot de passe et révocation |
| Inscription pouvant créer des comptes non contrôlés | Inscription coach uniquement, activation direction obligatoire en production, suspension journalisée | Tests d’activation, suspension, refus d’élévation de rôle |
| Unicité des déclarations uniquement côté navigateur | Réservation transactionnelle et contrainte SQLite sur le créneau ; unicité compte/période | Deux clients HTTP réservent simultanément : un seul réussit |
| Date du navigateur contournable | Date métier Europe/Paris fournie et vérifiée par le serveur | Mois courant/futur refusé ; octobre non sélectionnable dans le navigateur |
| Créneaux datés ou horaires invalides acceptables | Contrôle de l’existence du créneau, de la date, des horaires, de la catégorie et de la sélectionnabilité | Tests de créneaux fabriqués, `99:00`, accès libre et panier vide |
| Quatre espaces sans données officielles | Recherche sur boxingcenter.fr et transcription des quatre sources ; comparaison des deux sources existantes aux versions publiques | Six espaces parcourus à 1440, 768 et 390 px ; comptage des cours hebdomadaires testé |
| E-mails uniquement prévisualisés | Brevo REST côté serveur, double destinataire, récapitulatif complet, file durable, suivi et reprise contrôlée | Tests simulés ; un test technique réel autorisé et accepté par Brevo |
| Excel au format XML | Classeur `.xlsx` OOXML natif, accents, durées numériques, filtres et en-tête figé | Fichier réellement téléchargé et relu avec openpyxl ; test ZIP/XML |
| Journal et données modifiables depuis le navigateur | Journal serveur append-only, motifs, auteur, avant/après ; données privées filtrées | Refus SQL de suppression du journal ; isolation des coordonnées/historiques |
| Voiles sur les photos et texte fragile sur image | Photos naturelles, légendes de salles séparées ; photographie de connexion sans superposition de texte | Captures et inspection visuelle aux trois formats |
| Navigation horizontale mal adaptée | Sidebar desktop, panneau vertical clavier/mobile, état actif, fermeture Échap et retour du focus | Parcours des routes, absence de débordement global ; bouclage clavier du menu |
| Identifiant dupliqué et libellé ambigu dans le dialogue de mot de passe | Identifiant distinct, statut de dialogue distinct, arrière-plan inert, focus piégé/restauré | Inspection DOM et dialogue dans le navigateur ; aucune modification de mot de passe réel |
| Métadonnées de calendrier légèrement trop pâles | Couleur foncée des jours et états vides ; boutons désactivés sans opacité illisible | Mesure DOM après correction : aucun texte signalé sous les seuils dans le planning contrôlé |
| Images de salles très lourdes | WebP redimensionnés/compressés sans filtre ; originaux conservés | Les quatre photos totalisent environ 620 ko ; aucun visuel généré |

## Matrice des exigences du PDF

« Implémenté/testé » signifie vérifié dans le périmètre local décrit, pas certifié sur un hébergement encore inexistant.

| Section | Exigence | État actuel / limite |
|---|---|---|
| 1 | Déclaration/comptage des cours, sans facturation | Implémenté/testé ; aucun montant ni facture |
| 2 | Quatre clubs phase 1, Portet exclu | Implémenté/testé, même si le site public présente cinq clubs |
| 3 | États-Unis : MMA, Boxing Fitness, Boxe | Choix du club puis de l’espace ; trois plannings distincts |
| 4 | Compte avec identité, structure, téléphone, e-mail, mot de passe | Formulaire complet, validation serveur, doublon d’e-mail, hash scrypt ; activation direction ajoutée pour contrôler les accès |
| 5 | Choisir mois, année, club/espace ; afficher cours/horaires/disciplines/durées | Implémenté/testé sur les six sources ; années/périodes non renseignées ont un état vide |
| 6 | Navigation semaine par semaine et dates exactes | Implémenté/testé, y compris mois nécessitant six semaines et jours hors période |
| 7 | Compteurs par durée exacte | Implémenté/testé ; 40/60/80/90 min et durées réelles supplémentaires, notamment 45/70/75/85/100 min |
| 8 | Sélection puis validation par club vers panier | Implémenté/testé ; réservation atomique lors de l’ajout au panier |
| 9 | Panier final multi-clubs et récapitulatifs | Implémenté/testé, sous-totaux et totaux globaux, retrait avant validation |
| 10 | Anti-doublon entre coachs, nom du propriétaire | Implémenté côté serveur et SQL ; deuxième coach voit le cours désactivé et le nom du déclarant |
| 11 | Ouverture au premier jour du mois suivant | Contrôle serveur Europe/Paris ; date cliente non utilisée pour autoriser une écriture |
| 12 | Confirmation définitive, horodatage, immutabilité coach | Implémenté/testé ; corrections direction seules, identité figée dans les nouvelles déclarations |
| 13 | E-mails coach + boxingcenter31@gmail.com, tous cours et totaux | Intégration active localement ; double destinataire/récapitulatif testés avec Brevo simulé. Test technique réel accepté, réception en boîte à confirmer |
| 14 | Historique personnel et téléchargements | Implémenté/testé ; détails, CSV et impression/enregistrement PDF |
| 15 | Gestion direction, filtres, corrections, attributions, tous coachs | Implémenté/testé : ajout, modification, répétition, suppression motivée, attribution/retrait/réattribution, dossiers coachs, activation/suspension |
| 15 | Export CSV / Excel / idéalement PDF | CSV et XLSX réels testés. PDF via fenêtre d’impression du navigateur, **pas de générateur PDF serveur ni de pièce jointe automatique** |
| 16 | Plannings administrables, dates, couleurs, sélectionnabilité | Implémenté/testé ; six sources officielles intégrées ; exceptions ponctuelles et répétition hebdomadaire administrables |
| 17 | Identité Boxing Center et interface cohérente | Logo officiel, photographies fournies, DA blanche/marine selon instructions utilisateur ; violet secondaire, responsive et animations réduites |
| 18 | Sécurité, sauvegardes, stabilité, journal | Contrôles serveur, transactions, journal protégé et sauvegarde/restauration testés. TLS, ACL du service, copies hors site et supervision à valider sur l’hôte cible |
| 19 | Interdictions : facture, accès libre déclaré, doublon, mois courant, édition coach après validation | Implémenté/testé au niveau API, pas seulement désactivé visuellement |
| 20 | Livrables logiciels, espaces, règles, communications et exports | Écrans et API réalisés ; documentation fournie. Application en ligne non livrée, car aucun déploiement autorisé |
| 21 | Produit complet exploitable | Application locale connectée et testée ; acceptation finale de production conditionnelle aux points ci-dessous |

## Données officielles et ambiguïtés à confirmer

Source publique consultée le 11/10/2026 : [plannings Boxing Center 2026–2027](https://boxingcenter.fr/plannings-des-salles-boxing-center-toulouse/). Les six images ont été lues visuellement, copiées dans `assets` et reliées par « Voir la source ».

| Espace | Source officielle | Cours sélectionnables / semaine |
|---|---|---:|
| Minimes | [Visuel de septembre](https://boxingcenter.fr/wp-content/uploads/2026/09/planning-boxe-barriere-de-paris-minimes-2026-2027.jpeg) | 27 |
| Ramonville | [Visuel Ramonville](https://boxingcenter.fr/wp-content/uploads/2026/08/planning-boxing-center-ramonville-2026-2027.jpeg) | 22 |
| Saint-Cyprien | [Visuel Saint-Cyprien](https://boxingcenter.fr/wp-content/uploads/2026/08/planning-boxing-center-saint-cyprien-2026-2027.webp) | 29 |
| États-Unis MMA | [Visuel MMA](https://boxingcenter.fr/wp-content/uploads/2026/08/planning-boxing-center-etats-unis-salle-mma-2026-2027.jpeg) | 11 |
| États-Unis Boxing Fitness | [Visuel Fitness](https://boxingcenter.fr/wp-content/uploads/2026/08/planning-boxing-center-etats-unis-boxing-fitness-2026-2027.webp) | 15 |
| États-Unis Boxe | [Visuel Boxe de septembre](https://boxingcenter.fr/wp-content/uploads/2026/09/planning-boxing-center-etats-unis-salle-boxe-2026-2027.jpeg) | 20 |

Ces nombres sont des contrôles de transcription des créneaux, pas des indicateurs de cours réellement assurés. Les statistiques du logiciel proviennent des attributions et déclarations enregistrées.

Différences corrigées par rapport aux anciens visuels locaux : accès libre Minimes à partir de 11 h, Cross-training mardi/jeudi soir, disciplines des jeudi/vendredi aux États-Unis Boxe. Les comptes et données du prototype local n’ont pas été importés. Les identifiants antérieurs ont été conservés autant que possible ; aucun compte réel n’existe encore sur la base principale.

Points volontairement non inventés :

- L’expansion hebdomadaire actuelle utilise le 01/09/2026–31/08/2027. Les visuels indiquent seulement la saison ; faire valider le calendrier effectif et les exceptions.
- Le site public mentionne des cours enfants de septembre à juin. Les dates d’été de chaque groupe et les compétiteurs doivent être confirmées avant de figer le calendrier de déclaration.
- Certaines cases d’accès libre se superposent à des cours sur les visuels, notamment MMA. Les cases publiées sont conservées ; les accès libres ne sont jamais déclarables.
- Ramonville mercredi soir affiche explicitement 18:45–20:15 dans la case : cet horaire prévaut sur l’intitulé de ligne. Saint-Cyprien samedi affiche un cours sur deux lignes : 18:20–20:00, soit 100 minutes.

Le marqueur `SCHEDULES_CONFIRMED=false` reste donc volontairement présent. Le passage à `true` exige une validation métier réelle.

## Recette fonctionnelle dans le navigateur

Recette effectuée sur une **base séparée**, aux formats 1440, 768 et 390 px. Les pages ont été parcourues jusqu’en bas ; les captures sont conservées dans [output/qa](C:/Users/PC/Desktop/coach_web/output/qa).

Pages coach : vue d’ensemble, déclaration, panier, historique, récapitulatif, profil et dialogues de confirmation/sécurité. Pages direction : tableau de bord, plannings, coachs/fiches, exports, synthèse imprimable, journal avant/après et notifications. Écrans publics : connexion coach/direction, inscription et récupération d’accès.

Parcours réellement reproduits :

- Connexion valide et invalide ; message d’erreur lisible et champs conservés.
- Sélection Minimes, changement d’espace États-Unis, ajout au panier multi-clubs, confirmation finale et récapitulatif ; rechargement sans perte.
- Historique personnel, CSV téléchargé et vérifié, prévisualisation complète de la confirmation.
- Second coach : cours déclaré par le premier verrouillé avec son nom ; historique du premier non visible.
- Octobre 2026 visible mais aucun cours sélectionnable avant novembre.
- Modification du profil et enregistrement effectif.
- Direction : création d’un créneau hebdomadaire de recette, attribution, modification de durée vers 90 min, fiche coach, journal des corrections.
- Export XLSX réellement téléchargé : une feuille, 14 colonnes, trois cours, durées numériques 40/90/70 min, `A2` figé, filtre `A1:N4`, zéro formule.
- Récapitulatif imprimable inspecté. Aucun PDF serveur ou PDF téléchargé automatiquement n’est revendiqué.
- Suivi des deux notifications de la déclaration de recette, clairement désactivées sur cet environnement ; aucun message aux adresses de test.
- Menu mobile : ouverture/fermeture, Shift+Tab du bouton de fermeture vers la déconnexion, Échap et retour du focus au déclencheur.
- Dialogue de mot de passe inspecté sans saisir ni modifier un nouveau mot de passe dans le navigateur. Les écritures et la révocation sont testées au niveau API.

Résultats responsive : les cinq routes coach et six routes direction ont été inspectées aux trois formats. Les six plannings officiels ont fait l’objet d’un passage complémentaire aux trois formats après import. Aucun débordement global n’a été mesuré ; le calendrier et certains tableaux conservent un défilement **interne volontaire**, pas une navigation défilante.

Les contrôles DOM de contraste ont conduit à foncer les jours du calendrier, ses états vides, les métadonnées d’en-tête/historique, les badges et les libellés des filtres d’export. Les trois écrans d’accès aux trois formats, le planning corrigé et les pages coach/direction contrôlées ne signalent plus de texte sous les seuils 4,5:1 (texte normal) / 3:1 (grand texte) après correction dans ce contrôle. Cela ne constitue pas une certification WCAG complète, notamment pour tous les états dynamiques et les lecteurs d’écran.

## Tests techniques

Commandes : `npm run check`, `npm test`, `npm audit --omit=dev`.

- **21 fichiers JavaScript : syntaxe valide.** Frontend sans étape de compilation/bundler.
- **27 tests réussis, zéro échec** : 12 modèle métier, 14 API/auth/mail/persistance/configuration et 1 export XLSX.
- **Zéro vulnérabilité connue signalée par npm audit** au moment de la recette. Cela ne couvre pas le système d’exploitation ni toute vulnérabilité inconnue du code.
- Concurrence : un seul propriétaire lors de deux demandes HTTP simultanées.
- Confidentialité : coordonnées des autres coachs, historiques, tokens, payloads de récupération, clés et journal direction absents des réponses coach.
- Authentification : scrypt salé, e-mails uniques, sessions expirées refusées, rotation/révocation, compte suspendu refusé, rôle d’inscription non privilégiable.
- CSRF/origine/hôte, accès API direction, fichiers privés `.env`/base/code serveur refusés ; validation des données métier vérifiée.
- Réinitialisation : réponse uniforme, ancien lien invalide, expiration, usage unique, annulation des messages obsolètes et fermeture des sessions.
- Brevo simulé : destinataires, contenu, clé côté serveur, acceptation, HTTP 429, timeout ambigu sans renvoi automatique ; reprise manuelle vérifiée et journalisée.
- Persistance SQLite, sauvegarde `VACUUM INTO`, `integrity_check`, restauration réelle vers nouveau fichier et refus d’écrasement vérifiés.
- Garde-fous de production : HTTP, configuration mail absente et clé marquée exposée refusés. Node corrigé, confirmation des sources et administrateur sont également exigés au démarrage.

Pas de test de charge sur l’hébergement final, pas de test multi-instance, pas d’audit de pénétration externe, pas de certificat TLS ni de DNS provisionné. Aucun score Lighthouse ou garantie absolue de sécurité/performance n’est revendiqué.

## Brevo : résultat réel et secrets

L’utilisateur a explicitement demandé de conserver temporairement la clé fournie, puis autorisé un unique test à `boxingcenter31@gmail.com`. La vérification `GET /v3/senders` a répondu 200 et a indiqué l’expéditeur fourni actif. Le test a été accepté avec l’identifiant `<202610111017.28090599162@smtp-relay.mailin.fr>`. La trace est conservée dans `output/tests/brevo-test.sqlite`, sans copie de la clé.

Le statut de l’API signifie acceptation par le prestataire, pas réception dans la boîte : voir la [référence officielle Brevo](https://developers.brevo.com/reference/send-transac-email). La réception doit être confirmée par la direction. Aucune déclaration fictive n’a été envoyée.

La clé est dans `.env` uniquement, ignorée par Git, non servie par HTTP et protégée par ACL Windows. Elle ne figure pas dans le frontend, les rapports ou les fichiers d’exemple. `BREVO_KEY_EXPOSED=true` bloque sa mise en production. Les autres secrets publiés n’ont pas été réutilisés ; leur rotation reste à la charge du propriétaire.

Le choix de scrypt et ses paramètres s’appuie sur les [recommandations OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). La version locale de Node doit être remplacée par un LTS corrigé ; voir les [versions officielles Node](https://nodejs.org/en/blog/release/v24.21.0). Ni un hash robuste ni un audit npm vierge ne remplacent les contrôles d’exploitation.

## Conditions restantes de validation finale

1. Confirmation métier du calendrier et des exceptions, dont enfants/été et cases libres ambiguës.
2. Rotation des secrets exposés ; suppression du marqueur de risque seulement après rotation.
3. Création du véritable administrateur et activation des coachs légitimes. Base principale volontairement sans compte fictif.
4. Hôte avec Node LTS corrigé, disque persistant, HTTPS, permissions de service, sauvegardes chiffrées externes et supervision ; recette sur cet hôte.
5. Confirmation de réception du test, puis recette e-mail d’un parcours complet en préproduction avec des adresses contrôlées. Les webhooks de livraison/rebond restent hors implémentation actuelle.
6. Autorisation de déploiement. **Aucun déploiement n’a eu lieu.**

Procédure détaillée : [PRODUCTION.md](C:/Users/PC/Desktop/coach_web/PRODUCTION.md). Prise en main et bootstrap administrateur : [README.md](C:/Users/PC/Desktop/coach_web/README.md).
