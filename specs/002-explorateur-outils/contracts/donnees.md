# Contrat: fichier de données de l'explorateur

`<base>/explorateur.json`, écrit au build par `site/src/pages/explorateur.json.ts`, lu par
`site/src/lib/chargement.ts`. Dérivé des cinq fichiers de la racine, sous la même licence.

```json
{
  "meta": { "data_license": "CC-BY-SA-4.0", "updated_at": "2026-11-13T10:28:10-05:00" },
  "categories": [{ "id": "messagerie-electronique", "nom": "Messagerie électronique", "icone": "📧" }],
  "tags": ["chiffrement"],
  "sources": [{ "id": "praxis", "nom": "Répertoire d'outils…" }],
  "criteres": [{ "id": "donnees", "icon": "📍", "titre": "Où peuvent rester les données ?" }],
  "pays": [{ "code": "FR", "nom": "France" }],
  "outils": [
    {
      "id": "nextcloud",
      "nom": "Nextcloud",
      "categorie": "stockage-infonuagique-et-sauvegarde",
      "score": 2,
      "statut": "libre",
      "tags": ["auto-hebergement"],
      "source": "praxis",
      "enrichi": true,
      "licence": "AGPL-3.0-or-later",
      "remplace": [],
      "verdicts": { "donnees": "confirme", "controle": "infirme", "dependance": "confirme" },
      "deduits": ["donnees", "dependance"],
      "description": "…"
    }
  ]
}
```

## Règles

- `outils`: exactement les outils actifs, dans l'ordre des données; `id` unique.
- Champs toujours présents: `id`, `nom`, `categorie`, `score`, `statut`, `tags`, `source`,
  `enrichi`, `remplace`, `deduits`, `description`.
- Champs présents seulement s'ils ont une valeur: `scoreEstime` (`true`), `pays`, `licence`,
  `verdicts`. Aucun champ `null`.
- `categories`, `tags`, `sources`, `pays`: seulement les valeurs portées par un outil actif, pour
  qu'aucun filtre ne mène à une liste vide à lui seul.
- Chaque `categorie`, `tags[]`, `source`, `pays` et clé de `verdicts` d'un outil renvoie à un
  référentiel du même fichier.
- Le fichier ne contient ni description longue, ni citation, ni second avis, ni Open Hub.

## Vérification à la lecture

`chargement.ts` refuse, avec un message en français, un fichier qui n'est pas du JSON, une
réponse HTTP en erreur, ou un objet sans tableau `outils`, `categories`, `tags`, `sources`,
`criteres` ou `pays`. L'île affiche alors l'état d'erreur.
