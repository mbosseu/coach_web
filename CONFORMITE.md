# Audit de conformité Boxing Center

> Archive du prototype frontend. L’état actuel frontend + backend, les six sources officielles, Brevo et la recette de production sont décrits dans [AUDIT_PRODUCTION.md](C:/Users/PC/Desktop/coach_web/AUDIT_PRODUCTION.md). Les limites historiques ci-dessous ne décrivent plus l’architecture courante.

Audit du 10 octobre 2026. Document examiné intégralement : **Cahier des charges simplifié — Plateforme de validation des heures coachs Boxing Center.pdf**, 12 pages, 21 sections.

## Conclusion

Le frontend initial ne satisfaisait pas le périmètre fonctionnel du document. Il affichait plusieurs écrans, mais des actions se limitaient à un toast et les règles de déclaration n'étaient pas appliquées.

Les parcours coach et direction sont maintenant représentés par une **maquette interactive locale**, avec données persistées dans le navigateur. Il ne s'agit pas d'une plateforme sécurisée de production. Les exigences de serveur et les plannings officiels absents ne sont pas déclarés conformes artificiellement.

## Matrice exhaustive des exigences

| Section du PDF | État initial constaté | Correction apportée au frontend | État / limite restante |
|---|---|---|---|
| 1. Objet | Compteurs et historique statiques | Déclarations rattachées à un compte, comptage de cours, aucune tarification ni facture | Parcours frontend couvert ; mise en ligne non effectuée |
| 2. Clubs | Clubs et espaces confondus dans une seule liste | Quatre clubs phase 1 ; Portet exclu de la sélection | Couvert |
| 3. États-Unis | Trois salles au même niveau que les clubs | Choix du club États-Unis, puis choix MMA / Boxing Fitness / Boxe | Couvert |
| 4. Création de compte | Absente ; connexion acceptait n'importe quelles valeurs | Inscription nom, prénom, structure, téléphone, e-mail, mot de passe et confirmation ; validation, doublon d'e-mail et authentification locale de test | Interface couverte ; comptes sécurisés réels à fournir par serveur |
| 5. Parcours coach | Trois mois seulement, année inopérante, planning fixe | Douze mois, choix d'année, club et espace, cartes contenant cours, jour/date, début/fin, durée, club/espace, discipline et zone interne | Couvert pour les plannings disponibles |
| 6. Semaines | Numéro de semaine changeait, dates identiques | Calcul des semaines calendaires du mois, dates exactes, limites précédent/suivant, jours hors mois non déclarables ; six semaines si le calendrier l'exige | Couvert |
| 7. Calcul | Sélection partiellement comptée | Totaux réels par durée, toutes semaines du club confondues ; durées supplémentaires préservées | Couvert ; aucun montant financier |
| 8. Panier par club | Cours dépourvus de club et identifiants réutilisés | Identifiant unique du créneau daté ; sélection par période/compte/espace ; ajout par club ; réservation ; retrait avant validation | Couvert localement |
| 9. Panier final | Répartition arbitraire par index, dates et horaires fictifs | Groupes exacts par club/espace ; dates, horaires, disciplines, durées ; sous-totaux par durée et total du groupe ; totaux globaux | Couvert |
| 10. Doublons | Un seul cours « déjà déclaré » codé en dur | Réservation au panier, blocage pour les autres comptes, nom du propriétaire, couleur distincte ; maintien après validation | Couvert entre comptes du même navigateur ; unicité transactionnelle serveur nécessaire entre appareils |
| 11. Ouverture | Octobre annoncé verrouillé mais cliquable | Vérification à l'affichage et dans les actions : mois courant/futur visible mais non sélectionnable jusqu'au premier du mois suivant | Couvert côté frontend ; date serveur nécessaire en production |
| 12. Validation finale | Panier effacé, aucune déclaration créée | Confirmation anti-erreur, conservation des cours, horodatage, déclaration consultable, période immuable côté coach, correction réservée à la direction | Couvert localement |
| 13. E-mails | Message laissant entendre un envoi effectué | Prévisualisation complète avec coach, structure, période, groupes de cours, dates, horaires, durées, disciplines et totaux ; destinataires coach et boxingcenter31@gmail.com | **Non connecté** : aucun e-mail envoyé ; état explicite dans l'interface |
| 14. Espace personnel | Trois mois fictifs et bouton sans document | Historique issu des validations, détails des cours, dates de validation, corrections signalées, CSV téléchargeable, impression / enregistrement PDF | Couvert côté interface |
| 15. Administration | Ajout/modification/attribution simulés par messages | Consultation des plannings ; filtre cours déclarés / non déclarés / paniers et par coach ; formulaires ajout/modification/suppression ; attribution, retrait et réattribution ; récapitulatifs de tous les coachs | Couvert localement ; contrôle des droits serveur requis |
| 15. Exports | Boutons annonçant des fichiers inexistants | CSV UTF-8 ; XML Spreadsheet compatible Excel ; récapitulatif d'impression PDF ; période et club filtrables ; journal des exports | Excel livré en **.xml**, pas .xlsx ; PDF via impression navigateur, pas pièce jointe serveur |
| 16. Plannings administrables | Six plannings identiques inventés | Transcription de deux sources disponibles ; création de cours manquants ; modification de date, club/espace, nom, horaires, durée calculée, discipline, catégorie, couleur et sélectionnabilité ; application ponctuelle ou hebdomadaire jusqu'à une date de fin | **2 sources sur 6** disponibles. Les quatre autres plannings restent à fournir/renseigner |
| 17. Design | Voiles photo, incohérences de contraste et CTA | Logo officiel, photographies naturelles, marine/blanc, violet secondaire, cours différenciés, texte explicatif, état actif et focus clavier, responsive | PDF : fond sombre. DA claire conservée conformément aux instructions utilisateur postérieures ; connexion et module de suivi restent marine |
| 18. Sécurité / fiabilité | Accès admin direct ; données volatiles ; aucun journal | Formulaire direction distinct, filtrage des écrans par rôle, données locales conservées, confirmation, contrôle des conflits, journal admin auteur/motif/avant/après, horodatage | **Sécurité de production non couverte par un frontend** : sessions, hachage serveur, contrôle d'accès, sauvegardes, transactions et journal non falsifiable restent nécessaires |
| 19. Interdictions | Mois courant sélectionnable ; panier non fiable | Aucune facture, aucun montant ; accès libres bloqués ; conflits refusés ; mois non ouvert bloqué ; déclaration finale non éditable par coach | Couvert dans la maquette ; enforcement serveur requis |
| 20. Livrables | Écrans présents mais parcours incomplets | Tous les parcours frontend des 20 livrables représentés, y compris états vide/chargement/erreur/confirmation/validé et limites des services | Plateforme en ligne, sécurité, e-mails et toutes les données officielles restent à compléter |
| 21. Résultat attendu | Maquette visuelle ne fiabilisant pas les sélections | Parcours vérifiable de la connexion à la validation, puis consultation et correction direction | Référence frontend exploitable ; ne pas confondre cette couverture avec une conformité de production à 100 % |

## Sources de planning et hypothèses

- `assets/planning-minimes.webp` : copie du visuel local `planning-boxing-center-barriere-de-paris-minimes-2026-2027.webp` trouvé dans Downloads.
- `assets/planning-etats-boxe.jpg` : copie du visuel local `planning-boxe-2026-2027.jpg`, intitulé États-Unis — Salle Boxe.
- Les visuels sont reliés directement à chaque planning par le lien « Voir la source ».
- Aucun créneau n'est prérempli pour Ramonville, Saint-Cyprien, États-Unis Salle MMA et États-Unis Salle Boxing Fitness. Ils disposent d'un état vide et d'un formulaire d'administration.
- Les sources affichent « saison 2026–2027 » sans calendrier détaillé : expansion hebdomadaire du **1er septembre 2026 au 31 août 2027**, hypothèse à confirmer par la direction. Congés, jours fériés, annulations et exceptions ne sont pas déduits des images ; ils doivent être renseignés.
- Durées exactes conservées, notamment 45 min (baby boxe), 70 min et 85 min (États-Unis Boxe). Les catégories 40 min / 1 h / 1 h 20 / 1 h 30 du PDF sont des exemples de compteurs, pas une liste fermée.

## Architecture de la correction

- `schedule-data.js` : clubs, espaces, catégories et transcription des deux sources.
- `model.js` : périodes, semaines, cours datés, sélection, panier, réservations, validation et corrections administrateur.
- `frontend.js` : vues et interactions coach / direction / inscription.
- `compliance.css` : présentation des nouveaux états, formulaires, planning, récapitulatifs et impression.
- `index.html` charge ces modules ; aucune dépendance externe supplémentaire.
- `app.js` est conservé pour préserver l'ancien code, mais n'est plus chargé. Les anciennes fonctions dupliquées ne participent plus à l'exécution.
- Stockage local isolé sous `boxing-center-prototype-v2`, session sous `boxing-center-session-v2`. Il ne représente ni une base partagée ni une sauvegarde distante.

## Recette effectuée

La navigation a fait l'objet d'une refonte et d'une recette complémentaire le 11 octobre 2026 : [compte rendu de navigation](NAVIGATION.md). La rangée mobile défilante est remplacée par un panneau vertical accessible ; les dix routes coach / direction restent disponibles.

### Tests automatiques

Commande : `npm test` / `node --test tests/model.test.js`.

**12 tests, 12 réussis** : périmètre clubs ; frontières de semaines ; ouverture de période ; accès libre ; durées exactes ; panier multi-clubs ; réservations et retrait ; immutabilité et horodatage ; panier vide / brouillon / conflit ; droits et journal admin ; correction de déclaration validée ; ajout de cours ; répétition hebdomadaire. Les vérifications de syntaxe des trois fichiers JS chargés passent également.

### Recette navigateur

- Connexion des comptes de test Sophie, Valentin et direction ; accès personnel séparé.
- Création d'un compte coach de recette ; confirmation de mot de passe incohérente refusée ; inscription correcte acceptée.
- Sélection de deux cours Minimes dans deux semaines de septembre, puis d'un cours États-Unis Boxe ; panier correctement regroupé ; total de trois cours.
- Octobre 2026 : zéro cours sélectionnable avant le 1er novembre.
- Fenêtre de validation, annulation, confirmation définitive, récapitulatif et historique ; rechargement sans perte de déclaration ; cours non cliquables pour le compte ayant validé.
- Second compte Valentin : cours validé par Sophie désactivé et affichage du nom Sophie Martin.
- Récapitulatif CSV téléchargé et contenu du fichier vérifié ; prévisualisation de l'e-mail avec les deux destinataires, cours et totaux.
- Correction de durée direction (40 min vers 1 h), journal auteur/motif/date ; réattribution à Valentin ; récapitulatif Sophie actualisé.
- Filtre « Non déclarés » : aucun cours attribué affiché.
- Création hebdomadaire d'un cours de recette à Ramonville : présence aux deux dates demandées.
- Fiche coach avec coordonnées et accès à ses déclarations.
- Vue des exports et synthèse imprimable vérifiées. Export Excel XML téléchargé et analysé : XML valide, en-tête et trois lignes de données, 14 cellules par ligne. Aucune génération automatique d'un .xlsx ni envoi PDF serveur n'est revendiqué.
- Profil coach modifié et coordonnées enregistrées ; formulaire de changement de mot de passe de test inspecté.
- Desktop **1440 px** : dashboard, planning, panier, validation, récapitulatif, administration, formulaires et exports inspectés.
- Tablette **768 px** et mobile **390 px** : cinq routes coach et cinq routes direction parcourues. `scrollWidth` de la page n'excède pas `clientWidth` ; planning et tableaux ont un défilement interne.
- Connexion, inscription et dialogue de sécurité inspectés sur mobile ; onglet actif de la navigation mobile maintenu visible.
- Clavier : sélection d'un cours avec la barre d'espace, focus et défilement du planning conservés ; fermeture d'un dialogue avec Échap et retour du focus au bouton d'ouverture.
- Console navigateur : aucune erreur / aucun avertissement enregistré pendant ces parcours.

Capture de l'aperçu final : [dashboard conforme](output/qa/dashboard-conforme.png).

La recette utilise une origine de test distincte (`127.0.0.1:4174`) afin de conserver l'aperçu principal (`127.0.0.1:4173`) sans les inscriptions et cours de recette.

## Travail nécessaire avant production

1. Fournir les quatre plannings officiels manquants et confirmer les dates d'effet / exceptions des six plannings.
2. Connecter un backend avec comptes, sessions, mots de passe protégés côté serveur, rôles et accès limité aux déclarations du compte connecté.
3. Imposer côté serveur l'ouverture des périodes, l'immuabilité des validations et l'unicité des attributions, avec vérification transactionnelle des conflits simultanés.
4. Enregistrer les cours, paniers, déclarations et corrections dans une base partagée ; ajouter une sauvegarde et un journal admin conservant les versions.
5. Envoyer les confirmations depuis le serveur au coach et à `boxingcenter31@gmail.com`, avec suivi des erreurs / tentatives et récapitulatif complet.
6. Déployer sur le sous-domaine validé par la direction, en HTTPS. Le domaine suggéré dans le PDF n'autorise pas à le publier sans configuration.
7. Si souhaité : fournir de véritables exports `.xlsx` et des PDF générés côté serveur au lieu de l'XML Excel et de l'impression disponibles ici.

## Utilisation locale

```text
npm start
```

Ouvrir `http://127.0.0.1:4173/`. Le serveur local ne sert que les fichiers frontend et les assets, sur l'interface loopback.

La connexion propose les comptes de démonstration. Mot de passe initial de test : `Boxing2026!`. Aucun mot de passe réel ni donnée personnelle de production ne doit être utilisé dans cette maquette. Le hachage local des comptes créés est uniquement une simulation ; il n'apporte pas la sécurité d'une authentification serveur.
