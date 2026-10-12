# Recette réelle Boxing Center — 12 octobre 2026

## Méthode et portée

Le cahier des charges PDF de 12 pages a été lu intégralement. Les scénarios ci-dessous ont été effectués dans le navigateur intégré visible, par clics et saisies dans les formulaires. Les tests automatisés sont complémentaires et ne sont pas présentés comme une preuve de réception d'e-mail.

La recette métier utilise `node scripts/qa-browser.cjs` : le véritable serveur HTTP, les routes et la migration du projet, avec un moteur PostgreSQL local PGlite. Ce n'est ni une simulation de réponses API, ni la base Supabase de production. Les données sont persistées dans `output/tests/browser-postgres-2026-10-12`. Les e-mails sont volontairement désactivés dans cette recette.

Trois origines locales partagent cette base tout en isolant les cookies :

- Coach : `http://127.0.0.1:4210/`.
- Deuxième coach : `http://127.0.0.2:4210/`.
- Direction : `http://127.0.0.3:4210/`.

Les comptes coachs ont été créés par le formulaire d'inscription. Seul l'administrateur fictif est initialisé par le script de recette. Aucun compte fictif n'a été ajouté à la base de production par cette intervention.

## Comptes fictifs

| Compte | Rôle | Parcours |
| --- | --- | --- |
| `claire@recette.example.test` — Claire Martin — TEST | Coach | Inscription, activation, sélection multi-clubs, panier, validation, historique, profil, déconnexion |
| `malik@recette.example.test` — Malik Diallo — TEST | Coach | Concurrence, disponibilité, déclaration, séparation des données, suspension et réactivation |
| `amina@recette.example.test` — Amina Durand — TEST | Coach | Nouvelle inscription, message explicite d'attente, activation puis connexion réussie |
| `direction@recette.example.test` — Direction Recette | Administrateur | Activation, plannings, attributions, déclarations, journal et exports |

Les coordonnées et sociétés de ces comptes sont fictives. Le mot de passe de recette est défini dans le script, uniquement pour cet environnement isolé ; il ne doit jamais être utilisé en production.

## Pages réellement parcourues

- Connexion coach et direction, inscription, récupération de mot de passe.
- Coach : vue d'ensemble, déclaration et semaines de planning, panier, confirmation finale, récapitulatif, historique, détails et profil.
- Direction : vue d'ensemble, plannings et modales de création/correction/suppression/attribution, comptes coachs et détails, exports, récapitulatif imprimable, journal et notifications.

Les vues responsive contrôlées sont les cinq pages principales coach et les six pages principales direction, ainsi que l'authentification. Les captures intégrales permettent d'examiner les sections situées sous la ligne de flottaison ; elles ne signifient pas que chaque section a fait l'objet d'un test de chaque combinaison possible.

## Résultats observés par interaction

| Exigence / scénario | Action dans l'interface | Résultat réellement constaté |
| --- | --- | --- |
| Inscription professionnelle | Saisie des coordonnées, confirmation des mots de passe, soumission | Compte créé. Une confirmation persistante précise l'activation obligatoire par la direction ; l'adresse est conservée pour la connexion. |
| Compte non activé | Connexion avec les bons identifiants après inscription | Refus explicite : identifiants corrects, compte non actif, contacter la direction. Aucun accès au tableau de bord. |
| Activation | Direction : activer Amina avec un motif, puis connexion coach | Tableau de bord « Bonjour Amina ». Aucun vrai compte activé. |
| Validations du formulaire | Mots de passe différents, compte déjà inscrit, mot de passe incorrect, téléphone `123` | Messages d'erreur visibles. Le formulaire vide déclenche aussi la validation native du navigateur. |
| Choix du rôle | Identifiants coach saisis dans l'accès direction | Connexion refusée. |
| Période ouverte au mois suivant | Ouverture du planning d'octobre 2026 | Cours non sélectionnables ; ouverture indiquée au 1er novembre. Septembre est utilisable. |
| Clubs de phase 1 | Navigation Minimes, Ramonville, Saint-Cyprien et États-Unis | Quatre clubs, six espaces ; États-Unis propose MMA, Boxing Fitness et Boxe. Portet absent. |
| Semaines et cours réels du planning chargé | Navigation entre les semaines, sélection de dates différentes | Dates et créneaux changent correctement. Les accès libres restent non sélectionnables. |
| Panier multi-clubs | Ajouts successifs Minimes, Ramonville, Saint-Cyprien et les trois espaces États-Unis | Claire obtient huit cours sur six espaces. Les choix des espaces précédents restent présents. |
| Durées calculées | Sélection de cours de 40, 60, 80, 90 minutes et d'autres durées | Récapitulatif des durées exact ; un cours de 75 minutes ajoute sa catégorie, sans limitation artificielle aux quatre exemples. |
| Un seul coach par créneau | Malik sélectionne un créneau, puis Claire le réserve | Le brouillon concurrent de Malik est retiré ; le créneau est bloqué et affiche le coach attributaire. Après retrait du panier de Claire, il redevient disponible. Le texte d'un éventuel toast de conflit n'a pas été capturé. |
| Confirmation irréversible | Ouverture du dialogue, annulation, réouverture puis confirmation | Annuler conserve le panier. Confirmer enregistre la déclaration et l'horodatage ; les cours ne sont plus modifiables par le coach. |
| Séparation des utilisateurs | Historique Claire puis historique Malik | Claire voit ses huit cours ; Malik ne voit pas sa déclaration. Après sa propre validation, Malik voit un cours. |
| Profil | Téléphone invalide puis coordonnées corrigées et rechargement | Erreur affichée puis données corrigées persistées. |
| Correction des horaires | Direction : heure de fin avant le début, puis correction 12:40–13:40 | Première saisie refusée. La correction valide actualise la durée de 40 à 60 minutes dans la déclaration. |
| Réattribution | Transfert Claire → Malik, retrait puis restauration avec motifs | Disponibilités et récapitulatifs suivent les changements. Un motif vide est refusé par le formulaire. |
| Création hebdomadaire | Ajout d'un atelier fictif de 45 minutes les 1er et 8 septembre | Deux occurrences présentes dans les plannings. |
| Accès libre et suppression | Conversion du 8 septembre en accès libre, puis suppression des deux ateliers fictifs avec motifs | Accès libre bloqué côté coach. Le cours supprimé disparaît aussi du panier concerné. Les deux ateliers supprimés sont des données de recette ; les événements restent dans le journal. |
| Journal | Consultation après les corrections | Auteur, motif et horodatage visibles, avec commandes de détail avant/après. L'ouverture de chaque détail n'a pas été testée. |
| Suspension | Suspension de Malik, rechargement de son navigateur | Session révoquée et retour à la connexion. Après réactivation, accès rétabli et déclaration antérieure conservée. |
| Routes et permissions | Coach tente `#planning` | Retour à son tableau de bord ; aucun écran direction accessible. |
| Notifications | Consultation des messages de déclaration | Contenu, identité, club, dates, horaires et récapitulatif consultables ; envoi marqué désactivé, aucune fausse réception revendiquée. |
| CSV et Excel | Clics de téléchargement et ouverture des fichiers téléchargés | Neuf lignes, quatorze colonnes, 610 minutes, concordance CSV/XLSX ; durées numériques et aucune formule dans le XLSX contrôlé. |
| PDF | Ouverture de la synthèse puis clic « Imprimer / enregistrer en PDF » | Synthèse visible. Aucun fichier PDF final enregistré ; la fenêtre native et sa sortie restent à vérifier par l'utilisateur. |
| Clavier mobile | Ouverture du menu, Tab/Shift+Tab, Échap ; flèche droite dans le planning | Focus contenu dans le menu ; Échap ferme et restitue le focus. Le planning défile au clavier dans son conteneur, sans débordement global. |

Le cahier des charges prévoit la validation définitive par le coach et des corrections par la direction, pas une seconde procédure d'approbation/refus des déclarations. Aucun workflow métier supplémentaire n'a été inventé.

## Défauts corrigés et retestés

1. **Récupération des comptes en attente** : le serveur excluait les utilisateurs inactifs de la demande de récupération. Ils sont maintenant éligibles au lien, sans activation implicite. Le changement de mot de passe laisse le compte inactif. Ce dernier point a été vérifié par un test HTTP/PostgreSQL automatisé ; la saisie d'un nouveau mot de passe réel reste à l'utilisateur.
2. **Message de connexion trompeur** : les bons identifiants d'un compte inactif étaient présentés comme incorrects. Le message explicite a été constaté avec Amina, puis le même compte a pu se connecter après activation dans l'interface direction.
3. **Fausse promesse d'e-mail** : quand l'envoi est désactivé, le serveur renvoie désormais une indisponibilité explicite. Le formulaire indique l'absence d'envoi et propose un contact direction. Il n'annonce plus une panne d'e-mail avant la fin du chargement de session.
4. **Inscription ambiguë** : confirmation persistante, conservation de l'adresse saisie et distinction activation/récupération. Retest complet inscription → refus expliqué → activation → connexion.
5. **Photographie de connexion assombrie** : suppression du voile global. La photographie conserve sa luminosité ; le texte est placé sur une zone marine distincte sous l'image, et non sur un filtre couvrant celle-ci. Captures avant/après.
6. **Contraste de l'action principale** : texte marine sur violet doux, rapport de contraste mesuré d'environ 6,18:1 pour cette paire. Libellés, placeholders et liens secondaires renforcés. Ce chiffre ne constitue pas un audit WCAG exhaustif du site.
7. **Exports incohérents après modification du profil** : le récapitulatif imprimable utilisait la société actuelle, contrairement au CSV/XLSX. Tous utilisent désormais la même identité enregistrée à la validation. Nouveau passage dans l'écran d'export : neuf lignes, identité historique cohérente.
8. **Brouillon concurrent périmé** : la correction déjà présente dans l'espace de travail a été examinée et testée : retrait des sélections devenues indisponibles et désélection possible. Le scénario multi-coachs observé ne bloque plus la suite du parcours.

## Responsive

Contrôles dans le navigateur à **1440 × 1000**, **768 × 1024**, **375 × 812**. Les mesures portent sur la largeur réellement observée, pas seulement sur une commande de redimensionnement. Les cinq vues coach ont été capturées aux trois dimensions ; les six vues direction ont été parcourues en desktop et capturées en tablette/mobile. Mesures complémentaires enregistrées dans `output/recette-2026-10-12/dimensions-observees.json`.

Aucun débordement horizontal de la page dans ces vues. Le planning conserve un défilement interne nécessaire à sa grille horaire. Après les derniers correctifs, connexion/inscription ont été recapturées à 375 et 768 px, sans débordement. Il s'agit de tailles de viewport dans un navigateur, pas de tests sur téléphones physiques ou sur tous les moteurs.

## Vérifications techniques complémentaires

- `npm test` : **36 tests réussis, zéro échec** après les derniers correctifs, y compris récupération d'un compte inactif sans activation, concurrence et identité historique des exports.
- `npm run check` : syntaxe valide des **35 fichiers JavaScript présents dans l'espace de travail** (dont des scripts temporaires non publiés).
- `npm run build:vercel` : génération du frontend public réussie.
- `git diff --check` : aucune erreur d'espacement ; Git émet seulement ses avertissements de conversion LF/CRLF.
- Diagnostic Supabase en lecture seule : TLS vérifié, base initialisée, dix tables applicatives, un administrateur actif et quatre coachs inactifs. Au moment du diagnostic initial : aucune demande de récupération enregistrée.
- Contrôle Brevo en lecture seule : expéditeur configuré actif. Cela ne prouve pas la réception d'un message chez un destinataire.
- Journaux Vercel avant publication : `/api/session` et `/api/health` répondent 200. Une dépréciation `url.parse` est visible, sans erreur bloquante constatée sur ces requêtes.

## Preuves visuelles

Les fichiers JPEG restent locaux et ne sont pas publiés dans le frontend. Les premières captures portant un nom « desktop » ne garantissent pas cette taille ; utiliser les preuves ci-dessous et les dimensions mesurées.

- `output/recette-2026-10-12/03-comptes-actives.jpg` : activation des comptes fictifs.
- `output/recette-2026-10-12/06-cours-bloque-malik.jpg` : attribution bloquant l'autre coach.
- `output/recette-2026-10-12/07-panier-quatre-durees.jpg` : panier et totaux.
- `output/recette-2026-10-12/10-historique-claire.jpg` : déclaration enregistrée.
- `output/recette-2026-10-12/13-dashboard-direction.jpg` : consultation direction.
- `output/recette-2026-10-12/14-dashboard-coach-desktop.jpg` : desktop effectivement contrôlé.
- `output/recette-2026-10-12/19-journal-corrections.jpg` : traçabilité.
- `output/recette-2026-10-12/22-export-identite-corrigee.jpg` : cohérence historique après correction.
- `output/recette-2026-10-12/57-connexion-photo-avant.jpg` et `58-connexion-photo-apres.jpg` : suppression du voile.
- `output/recette-2026-10-12/59-inscription-activation-explicite.jpg` : inscription et instructions.
- `output/recette-2026-10-12/60-compte-en-attente-message-corrige.jpg` : refus expliqué.
- `output/recette-2026-10-12/61-connexion-apres-activation-reussie.jpg` : connexion après activation.
- `output/recette-2026-10-12/62-api-production-repond-200.jpg` : état des requêtes réelles Vercel.
- `output/recette-2026-10-12/63-connexion-mobile-corrigee.jpg` à `67-inscription-mobile-corrigee.jpg` : dernière recette responsive de l'authentification.

## Limites : ne pas déclarer ces points validés

- Réception en boîte mail et ouverture d'un véritable lien de récupération : à contrôler après publication avec le destinataire. Un statut Brevo « accepté » n'est pas « reçu ».
- Saisie, confirmation et soumission d'un nouveau mot de passe dans le navigateur : à effectuer par l'utilisateur, pas par l'agent.
- Notifications de déclaration réellement livrées : cette recette n'envoie pas d'e-mails de coachs fictifs.
- Retry/ambiguïté de livraison Brevo : couvert par les tests techniques, pas par une panne réseau volontaire provoquée en production.
- Cron Vercel quotidien : ne constitue pas une reprise garantie chaque minute ; un incident peut dépasser la durée de validité de 30 minutes d'un lien de récupération. La supervision et la stratégie de reprise restent à finaliser avant de revendiquer une disponibilité opérationnelle complète.
- Sortie PDF native, restaurations de sauvegarde en production, tests de charge, navigateurs multiples et appareils physiques : non réalisés dans cette recette.
- Exhaustivité des exceptions saisonnières/fermetures des plannings : pas certifiée par le seul test des grilles chargées.
- Les secrets précédemment exposés doivent être remplacés. Aucun secret n'est inclus dans ce rapport, les captures ou le commit.

Cette recette valide les parcours observés ; elle ne vaut pas certification de sécurité ni garantie d'absence de tout défaut en production.
