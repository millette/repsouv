# Expérience: les schémas de mion RunTypes décrivent-ils le JSON échangé?

Branche `mion-smoke`. Dossier isolé (son propre `package.json`), sans effet sur le projet principal.

## Reproduire

```
cd spike-mion
nub install
nub run schema:tjs     # ts-json-schema-generator 2.9.1-next.18 + typescript 6.0.3 -> schemas/tjs.schema.json
nub run construire     # esbuild + plugin RunTypes -> mion.mjs (ignoré par git)
nub run comparer       # tableau des 10 échantillons, 5 validateurs
nub run complement     # décodeur et checkUnknowns
nub run typecheck
```

## Le type (`types.ts`)

`Message` = `id: string`, `cree: Date`, `note?: string`, `contenu: Texte | Image` (union discriminée sur `kind`).
Échantillons: `echantillons.json` (3 valides, 7 invalides), avec la colonne `attendu`.

## Résultats

| Validateur | Écarts avec « attendu » |
|---|---|
| Ajv + schéma ts-json-schema-generator | aucun |
| Ajv + schéma RunTypes (`createJsonSchemaFn`) | accepte la propriété supplémentaire |
| RunTypes `createValidateFn` sur le JSON brut | refuse les 3 échantillons valides (`cree` est une chaîne, pas une `Date`) |
| RunTypes: `createJsonDecoderFn` puis `createValidateFn` | accepte la propriété supplémentaire (le décodeur la supprime) |

Constats:

1. **Le schéma RunTypes décrit bien le JSON du fil.** `cree` devient `{type: "string", format: "date-time", jsType: "Date"}`, l'optionnel n'est pas dans `required`, et l'union discriminée est un `anyOf` avec `const` sur `kind`. Sur les 10 échantillons, Ajv donne le même verdict avec ce schéma et avec celui du générateur, sauf pour la propriété supplémentaire.
2. **Le schéma RunTypes est plus permissif.** Il n'a pas `additionalProperties: false`, alors que le générateur le met par défaut. Un format de fichier strict (clés inconnues refusées) n'est donc pas exprimé.
3. **Ses validateurs ne valident pas le JSON brut.** `createValidateFn<T>` valide la valeur en mémoire (une `Date`). Pour valider du JSON, il faut passer par `createJsonDecoderFn`, qui reconstruit la `Date` mais supprime les clés inconnues (stratégie `clone`, par défaut), donc elles ne sont jamais signalées. `createValidateFn(undefined, {checkUnknowns: true})` les refuse, mais sur la valeur déjà décodée, après suppression: il faut valider avant le décodage, sur un objet reconstruit à la main (voir `complement.ts`).
4. **Mot-clé non standard.** Le schéma contient `jsType`. Ajv en mode strict le refuse (`unknown keyword`); il faut le déclarer (`addKeyword("jsType")`) ou désactiver le mode strict. La doc mentionne `portable: true` pour retirer ces mots-clés (non essayé ici).
5. **Draft différent.** RunTypes produit du 2020-12 (sans `$schema`), le générateur du draft-07 avec `$schema` et `definitions`/`$ref`. Il faut `Ajv2020` pour le premier, `Ajv` pour le second.
6. **`Date` côté générateur.** `ts-json-schema-generator` convertit `Date` en `{type: "string", format: "date-time"}` sans configuration, ce qui correspond au JSON échangé.

## Contraintes d'exécution

- Les appels `createXxx<T>()` ne fonctionnent qu'après transformation par un plugin de bundler. Ici: `esbuild` + `@mionjs/devtools/runtypes/esbuild`, avec `@mionjs/bin-compiler` (binaire natif, Node 24 ou plus). Ça a fonctionné sous `nub` (le script de construction s'exécute avec `nub`), mais il faut une étape d'empaquetage avant de pouvoir exécuter le code généré.
- Version testée: `@mionjs/*` 0.14.0 (avant la 1.0).

## Limites de l'expérience

Un seul type, 10 échantillons, un seul bundler. Non testés: `portable: true`, contraintes de format (`TF.*`), `tags.json`/`criteres.json`, un fichier `{meta, outils}` complet, les clés inconnues avec `checkUnknowns` sur le JSON brut.
