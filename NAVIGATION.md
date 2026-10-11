# Refonte de la navigation Boxing Center

> Rapport de la refonte initiale de navigation. Une page direction « Notifications » a depuis été ajoutée ; la recette complète actuelle est dans [AUDIT_PRODUCTION.md](C:/Users/PC/Desktop/coach_web/AUDIT_PRODUCTION.md).

Recette terminée le 11 octobre 2026.

## Problème initial

Sur les petits écrans, la sidebar était transformée en une rangée de boutons de largeur supérieure à l'écran. Plusieurs feuilles de styles imposaient un défilement horizontal et masquaient des rubriques. La navigation ne permettait pas de voir toutes les destinations en une seule lecture.

## Corrections

- Au-dessus de 1024 px : sidebar fixe de 232 px, liens verticaux, sections identifiées et espace compte / déconnexion séparé.
- À 1024 px et moins : bouton Menu dans l'en-tête et panneau vertical repliable, de 292 px maximum. Aucun carrousel ni défilement horizontal de navigation.
- Coach : Mon espace, Déclarations, Compte. Direction : Pilotage, Gestion.
- Même famille d'icônes SVG, alignements homogènes, libellés complets et état actif bleu marine sur fond clair.
- Véritables liens vers les routes existantes, attribut `aria-current`, bouton d'ouverture avec `aria-expanded` et `aria-controls`.
- Menu compact modal : arrière-plan inerte, focus contenu dans le menu, fermeture par bouton, clic extérieur ou Échap. Retour du focus à l'ouverture ; focus sur le titre après changement de page.
- Passage desktop / mobile : fermeture du panneau et repositionnement du focus vers un élément visible.
- L'ouverture et la fermeture du menu ne recréent pas le formulaire : les saisies non enregistrées sont conservées.
- Lien d'évitement « Aller au contenu », transitions discrètes et désactivation de ces transitions si la réduction des animations est demandée.
- Gouttière de défilement stable pour éviter que le contenu se décale à l'ouverture du menu.

Aucune dépendance ajoutée. Les comptes, données, règles métier et chemins des routes restent inchangés.

## Vérifications dans le navigateur

Les cinq routes coach (`dashboard`, `declare`, `basket`, `history`, `profile`) et les cinq routes direction (`overview`, `planning`, `coaches`, `exports`, `audit`) ont été parcourues à **320, 390, 768, 1024, 1025 et 1440 px**.

- Page active conforme à la route ; fermeture automatique après navigation.
- Pas de débordement horizontal de page ni de sidebar : `scrollWidth` ne dépasse pas `clientWidth`.
- Plannings et tableaux conservent leur défilement interne nécessaire à la lecture des données.
- Entrée pour ouvrir, Tab / Maj+Tab pour parcourir le menu, Échap pour fermer, retour du focus vérifiés.
- Clic extérieur et conservation d'une saisie temporaire du profil vérifiés, sans enregistrer cette saisie.
- Bascule de 390 vers 1440 px puis retour à 390 px : panneau fermé, arrière-plan réactivé, focus visible.
- Retour / avance navigateur et lien d'évitement : route et focus corrects.
- Dialogue « Ajouter un créneau » : ouverture, fermeture par Échap et focus rendu au bouton métier.
- Déconnexion direction, puis reconnexion coach vérifiées.
- Aucune erreur ni aucun avertissement dans la console durant cette recette.
- `npm run check` : réussi. `npm test` : **12 tests métier réussis sur 12**.

## Captures

- [Sidebar desktop](output/qa/navigation-desktop.png)
- [Menu mobile ouvert](output/qa/navigation-mobile.png)
- [En-tête mobile, menu fermé](output/qa/navigation-mobile-fermee.png)

## Fichiers concernés

- `frontend.js` : structure sémantique, groupes de navigation, ouverture / fermeture et gestion du focus.
- `compliance.css` : présentation de la sidebar et du panneau compact, états actifs, responsive et transitions.
- `index.html` : versions des assets pour charger les corrections sans ancien cache.

Les limites de mise en production de la maquette demeurent celles décrites dans [CONFORMITE.md](CONFORMITE.md).
