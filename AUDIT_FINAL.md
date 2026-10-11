# Rapport d'audit frontend Boxing Center

> Mise à jour du 11/10/2026 : ce rapport de design est historique. Consulter [AUDIT_PRODUCTION.md](C:/Users/PC/Desktop/coach_web/AUDIT_PRODUCTION.md) pour l’audit actuel, la recette API, les six plannings officiels et les prérequis de déploiement.

> Rapport antérieur de design. La conformité fonctionnelle au cahier des charges et les corrections récentes sont détaillées dans [CONFORMITE.md](CONFORMITE.md). Les limitations de ce rapport antérieur sont remplacées par cette nouvelle analyse.

## Périmètre parcouru

### Espace coach

- Connexion et états de connexion, aide mot de passe et accès direction.
- Tableau de bord : statistiques, campagne mensuelle, historique récent et espaces clubs.
- Déclaration mensuelle : période, club/espace, navigation hebdomadaire, cours disponibles, accès libre, cours déjà attribué et récapitulatif.
- Panier : regroupement par club, total global et validation définitive.
- Historique : déclarations validées et consultation des récapitulatifs.
- Profil : coordonnées professionnelles, enregistrement et sécurité.

### Espace direction

- Tableau de bord : indicateurs, déclarations à contrôler et statuts.
- Plannings : six espaces phase 1, état administrable, synchronisation et actions de modification.
- Coachs : comptes, structures, affectations et statuts.
- Exports : sélection de période/club, CSV, Excel, PDF et traçabilité.

## Défauts identifiés et corrections

| Zone | Défaut | Correction |
|---|---|---|
| Identité | Ancien logo encore utilisé dans plusieurs zones | Logo officiel centralisé dans la barre supérieure et la connexion |
| Connexion | Voile et panneau blanc trop présents sur la photographie | Photo naturelle, texte posé directement avec ombre locale maîtrisée |
| Navigation | Texte peu visible et navigation mobile réduite à des points | Contraste renforcé, libellés conservés, navigation horizontale mobile |
| Dashboard | Campagne et photos de clubs visuellement mélangées | Texte de campagne lisible sur photo, légendes séparées en bandeau clair |
| Planning | « Accès libre » et textes des cours trop faibles | États désactivés lisibles, boutons clavier, focus et contraste renforcés |
| Panier | État vide peu informatif, validation possible sans sélection | Message structuré et validation désactivée si le panier est vide |
| Profil | Route présente mais écran inexistant | Écran profil complet avec coordonnées, sauvegarde simulée et sécurité |
| Admin | Routes Coachs/Exports absentes et route Plannings incohérente | Quatre écrans admin distincts et navigation synchronisée |
| Actions | Plusieurs boutons sans retour visuel | Toasts de confirmation pour sauvegarde, export, consultation et actions admin |
| Responsive | Risque de débordement et contenu masqué sur petits écrans | Grilles adaptatives, tableaux scrollables, planning horizontal et contrôles mobile |
| Accessibilité | Cours en `div`, focus non systématique | Cours convertis en boutons avec `disabled`, `aria-pressed` et focus visible |
| Préférences | Animations non adaptées aux préférences système | Réduction des transitions et animations avec `prefers-reduced-motion` |

## Contrôles effectués

- `node --check app.js` : succès.
- Connexion coach : succès.
- Aide mot de passe : message de retour visible.
- Navigation coach : tableau de bord, déclaration, panier, historique et profil.
- Sélection d'un cours : compteur du récapitulatif mis à jour.
- Ajout au panier : ligne et total visibles.
- Validation définitive : fenêtre de confirmation lisible.
- Accès direction : succès.
- Navigation admin : tableau de bord, plannings, coachs et exports.
- Actions admin : retours toast visibles.
- Desktop 1440 px : vérifié visuellement sur les parcours principaux.
- Tablette 768 px : vérification des quatre routes coach, sans débordement horizontal détecté.
- Mobile : navigation compacte, cartes empilées, planning défilable horizontalement, formulaires adaptés.

## Limites assumées

Les exports, l'authentification, les sauvegardes, l'envoi d'e-mails et les modifications de planning restent des simulations frontend conformément au périmètre de la maquette. Aucun changement de logique métier réelle n'a été introduit.
