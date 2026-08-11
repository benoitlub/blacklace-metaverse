# Prompt d'ingestion du lore

Prompt réutilisable pour relire les sources de Blacklace Island et en produire une fiche exploitable par le générateur. Sert à **rafraîchir** `docs/lore/blacklace-island.md` quand le canon bouge, de façon reproductible.

Deux usages : le donner à un agent qui a accès aux sources, ou s'en servir de checklist manuelle.

---

## Prompt

````text
Tu extrais du lore exploitable par un générateur 3D à partir des sources de
Blacklace Island. Tu ne réécris pas l'univers : tu le rends utilisable.

## Autorité des sources

Par ordre décroissant. En cas de contradiction, la source la plus haute gagne.

1. Notion — Grimoire, Constitution « L'Ère d'Aloisia », Bible visuelle
   transmedia, Annexe II (Métabolisme), fiches Lieux et personnages.
2. `blacklace-echo`, `src/data/islandPoiScenes.ts` — zones et points d'intérêt
   déjà structurés (`zone`, `title`, `description`, `mood`, `objective`, `clues`).
3. Roman « Fragments de Blacklace Island » — détails sensoriels et matériaux.
4. `octopus-engine-app/constitutions/blacklace.md` — rappel de la frontière.

## Règles non négociables

- **N'invente rien.** Si un fait n'est pas dans les sources, il n'existe pas.
  Un manque se déclare, il ne se comble pas.
- **Signale les contradictions explicitement** au lieu de trancher en silence
  (Constitution, loi 4). Liste-les dans une section dédiée, avec les deux
  versions et leur source.
- **Cite ta source** pour chaque bloc extrait (Constitution, loi 8).
- **Faits, pas prose.** Tu produis des matériaux, des couleurs, des formes, des
  règles. Tu ne recopies pas de passage narratif : le texte du roman ne sort
  pas de sa source.
- **Une page inaccessible est une erreur**, pas une invitation à deviner.
  Signale-la (`accès refusé`, `404`) et continue sur les autres.
- **Aloisia ne se montre pas.** Elle ne devient jamais un asset visible.

## Ce que tu produis

Un document Markdown avec ces sections, dans cet ordre :

1. **Ton** — la règle de registre qui prime, et ses conséquences concrètes
   sur un asset.
2. **Lieux** — pour chaque zone : nature, fonction, matériaux, ambiance
   lumineuse, sous-lieux connus.
3. **Entités et personnages** — rôle, signes visuels identifiables. Distingue
   les entités (non modélisables) des personnages (modélisables).
4. **Règles de l'univers** — ce qui rend l'île reconnaissable : symboles,
   anomalies, physique locale, grandeurs mesurées.
5. **Langage visuel** — palette, matériaux, motifs récurrents, lumière, objets
   technologiques.
6. **Interdits** — ce qu'un prompt ne doit jamais produire.
7. **Contradictions relevées** — vide si aucune.
8. **Ce qui reste à extraire** — les manques identifiés, nommés.

En tête du document : statut (dérivé, non canonique), liste des sources
consultées, date d'extraction.

## Critère de réussite

Un lecteur qui n'a jamais ouvert le roman doit pouvoir écrire un prompt
text-to-3D cohérent avec l'univers à partir de ta seule fiche. Si une zone
reste indiscernable d'un décor générique, l'extraction a échoué.
````

---

## Composition d'un prompt de génération

Une fois la fiche produite, un prompt text-to-3D pour une zone se compose de cinq blocs. C'est cet assemblage que le `ContextProvider` fournit au backend de génération.

| Bloc | Origine | Exemple |
|---|---|---|
| Type d'asset | requête | `environment`, `prop`, `structure` |
| Zone et intention | requête + `islandPoiScenes` | « Place du Marché de Rotas, fontaine centrale » |
| Ambiance | champ `mood` de la zone | « pierre chaude, cuivre patiné, eau lointaine » |
| Langage visuel | fiche, §5 | matériaux, palette, lumière |
| Interdits | fiche, §6 | ni texte, ni logo, ni personnage |

Puis les contraintes techniques, indépendantes du lore : asset unique, centré sur l'origine, échelle métrique, géométrie fermée, export GLB, temps réel Unity.

---

## Rafraîchir la fiche

1. Vérifier l'accès aux pages Notion (certaines ne sont pas partagées avec l'intégration).
2. Passer le prompt ci-dessus.
3. Comparer au fichier existant — traiter chaque contradiction relevée avant de remplacer.
4. Mettre à jour la date d'extraction et la liste des sources.
5. Faire valider les écarts de canon (Constitution, loi 2 : l'IA propose, Benoît dispose).
