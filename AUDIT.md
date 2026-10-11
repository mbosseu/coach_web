# Audit initial et matrice de couverture

> Archive de la première maquette. Voir [AUDIT_PRODUCTION.md](C:/Users/PC/Desktop/coach_web/AUDIT_PRODUCTION.md) pour l’état actuel du logiciel connecté et les résultats de recette.

## Constat sur la maquette fournie

Le dossier de travail `C:\Users\PC\Desktop\coach_web` était vide au moment de l'audit : aucun écran, composant, parcours ou fichier de maquette existant n'a pu être comparé. La conformité de l'existant est donc évaluée à 0 % par absence d'artefact exploitable, et non comme un jugement sur une interface invisible.

## Exigences couvertes dans la maquette produite

| Périmètre | Couverture | Représentation |
|---|---:|---|
| Connexion coach | Oui | Écran de connexion avec identité Boxing Center |
| Accès direction/admin | Oui | Entrée séparée vers la console admin |
| Tableau de bord coach | Oui | Activité, statut du mois, historique et clubs |
| Mois + année | Oui | Sélecteurs dans le parcours de déclaration |
| Clubs phase 1 | Oui | Minimes, Ramonville, Saint-Cyprien, États-Unis |
| Sous-espaces États-Unis | Oui | Salle MMA, Salle Fitness, Salle Boxe |
| Planning hebdomadaire | Oui | Jours, dates, horaires, navigation semaine par semaine |
| Cours colorés | Oui | Couleurs par famille de discipline |
| Accès libre non sélectionnable | Oui | Case inactive et visuellement distincte |
| Cours déjà déclaré | Oui | État vert + coach déclarant visible |
| Récapitulatif temps réel | Oui | Totaux par durée et total général |
| Validation par club | Oui | Passage dans un panier provisoire |
| Panier multi-clubs | Oui | Groupes par club et ajout d'autres sélections |
| Validation définitive | Oui | Modal d'avertissement irréversible |
| Historique coach | Oui | Mois validés, statut et accès PDF simulé |
| Tableau de bord admin | Oui | Déclarations, volumes, alertes et taux de validation |
| Gestion des plannings admin | Oui | Vue des six plannings, état administrable |
| Exports CSV / Excel / PDF | Partiel | Point d'entrée UI présent, génération backend non implémentée |
| E-mail de confirmation | Partiel | Promesse présentée dans le parcours, envoi backend non implémenté |
| Sécurité, sauvegarde, journal admin | Partiel | États UI représentés, infrastructure non implémentée |

## Éléments non visualisables ou à traiter côté développement

- Authentification réelle, hash des mots de passe, permissions et sessions.
- Verrouillage transactionnel anti-doublon côté serveur.
- Horodatage persistant, journal complet des modifications et sauvegardes.
- Envoi réel des e-mails au coach et à `boxingcenter31@gmail.com`.
- Production réelle des exports CSV, Excel et PDF.
- Import complet des plannings réels à partir des visuels sources.
- Gestion complète des formulaires admin d'ajout, suppression et modification d'un créneau.

## Direction UX retenue

Fond sombre, rouge Boxing Center pour les actions, accent doré pour les états en attente, vert pour les validations, cartes aérées, planning dense mais lisible, navigation persistante et responsive desktop/tablette/mobile. Les photographies fournies ont été intégrées dans les couvertures des espaces et la page de connexion.
