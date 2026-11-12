# Expérience : les schémas de mion RunTypes décrivent-ils le JSON échangé ?

*Documentation : [README](../README.md) · [Implémentation](../implementation.md) · [Historique](../historique.md) · [Sommaire statistique](../sommaire.md) · [Analyse de la classification](../analyses/classification/README.md)*

Branche `mion-smoke`. Dossier isolé (son propre `package.json`), sans effet sur le projet principal.

## Reproduire

```
cd spike-mion
nub install
nub run schema:tjs     # ts-json-schema-generator 2.9.1-next.18 + typescript 6.0.3 -> schemas/tjs.schema.json
nub run construire     # esbuild + plugin RunTypes -> mion.mjs (ignoré par git)
nub run comparer       # tableau des 10 échantillons, 5 validateurs
nub run complement     # décodeur et checkUnknowns
nub run schema:tjs2    # schémas du générateur pour les cas limites (types2.ts)
nub run cas-limites    # récursion, union avec Date, Map, union objet/Date, portable
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

Un seul bundler, quelques types. Non testés: contraintes de format (`TF.*`), `tags.json`/`criteres.json`, un fichier `{meta, outils}` complet, `checkUnknowns` sur le JSON brut, `null` dans une union, `bigint`, `Set`, `URL`.

## Deuxième série: cas limites (`types2.ts`, `cas-limites.ts`)

Quatre types: `Noeud` (récursif), `UnionDate` (`Date | string`), `Compteurs` (`Map<string, number>`), `Melange` (`{kind:"a",x} | Date`).
Pour chacun: schéma RunTypes, schéma RunTypes avec `portable: true` (`schema({libraryOptions:{portable:true}})`), schéma du générateur, sortie réelle de `createJsonEncoderFn`, et des échantillons validés par Ajv.

| Cas | Schéma RunTypes | Schéma du générateur (TJS) | JSON « naturel » |
|---|---|---|---|
| Récursion | `{"$ref":"#"}`, correct | `$ref` vers une définition, correct | les deux schémas donnent le même verdict |
| `Date \| string` | tuple étiqueté `[0, string]` ou `[1, date-time]` | `anyOf` de deux chaînes | **RunTypes refuse la chaîne ISO naturelle**; TJS l'accepte |
| `Map<string, number>` | tableau de paires `[["a",1]]` | `{size: number}`, **incorrect** | RunTypes accepte les paires et refuse `{a:1}`; TJS refuse les deux |
| objet `\| Date` | tuples étiquetés `[1, date-time]` et `[-1, objet]` | `anyOf` objet ou `date-time` | **RunTypes refuse l'objet et la date naturels** |

Constats:

1. **Récursion:** les deux outils sont corrects et équivalents.
2. **Dès qu'une union contient un membre propre à JavaScript (`Date`), le schéma de RunTypes décrit son encodage étiqueté, pas le JSON naturel.** La sortie de l'encodeur valide contre le schéma de RunTypes, mais pas contre celui du générateur, et inversement pour les échantillons naturels. Les unions d'objets simples (première série) restent des `anyOf` sans étiquette.
3. **Les étiquettes sont peu intuitives:** dans `Melange`, la `Date` a l'indice `1` et l'objet `-1`; dans `UnionDate`, la chaîne a l'indice `0`. Un client externe ne peut pas les deviner.
4. **`portable: true` ne change rien à l'encodage.** Il retire seulement `jsType` (et laisse `format: date-time`); les tuples étiquetés restent. Pour `Noeud`, le schéma est identique.
5. **Le décodeur de RunTypes lève une exception** (colonne `ERR`) sur du JSON naturel pour ces unions, au lieu de le rejeter proprement; il n'accepte que la forme étiquetée.
6. **`Map`:** le générateur produit `{size: number}`, un schéma faux qui décrit les membres de la classe et non des données. RunTypes produit la forme qu'il écrit réellement (paires), cohérente avec son encodeur.
7. **Aller-retour interne:** pour les quatre types, encodeur, décodeur puis validateur donnent `oui`. RunTypes est cohérent avec lui-même; la question est l'interopérabilité avec du JSON non produit par lui.

### Conclusion de cette série

- Pour un format de fichier strict et lisible par d'autres outils (`outils.json`), il faut éviter les types qui déclenchent l'encodage propre à RunTypes: unions avec `Date`, `Map`, `Set`, `bigint`. Avec des types JSON simples (objets, chaînes, nombres, tableaux, énumérations, unions d'objets discriminées), RunTypes et le générateur décrivent le même JSON, avec la réserve de `additionalProperties`.
- Les données du dépôt n'utilisent que des types JSON simples (voir `extract.ts`: chaînes, nombres, booléens, tableaux, `null`, unions littérales). Elles évitent donc les cas problématiques.
- Le générateur échoue silencieusement sur `Map` (schéma faux), tandis que RunTypes échoue de façon visible sur le JSON naturel. Aucun des deux ne remplace une revue des types exposés.

## Essai avec tsdown (remplaçant d'esbuild)

`tsdown.config.ts` (tsdown 0.23.7, rolldown 1.3.1) avec `@mionjs/devtools/runtypes/rolldown`; script `nub run construire:tsdown`, sortie dans `sortie-tsdown/` (ignoré par git). La construction esbuild (`nub run construire`) est conservée pour comparaison.

Résultat: **fonctionne, avec une sortie équivalente.** Les trois scripts (`comparer.ts`, `cas-limites.ts`, `complement.ts`), exécutés une fois avec chaque bundle, produisent une sortie textuelle identique, octet pour octet. Le plugin voit donc bien les appels `createXxx<T>()` avant que rolldown retire les types.

Écarts observés:

- tsdown découpe en trois fichiers (`mion.mjs`, `mion2.mjs`, et un morceau partagé `createJsonSchemaFn-<hash>.mjs`), pour 43 ko au total, contre deux fichiers autonomes de 35 et 38 ko avec esbuild.
- tsdown affiche un avertissement: `@mionjs/run-types` est embarqué dans le bundle parce qu'il est en `devDependencies`. Il suggère `deps.onlyBundle`; non appliqué ici.
- Les scripts d'exécution importent `./mion.mjs`; avec tsdown, il faut copier le dossier de sortie (non fait dans le dépôt; le test a copié les fichiers temporairement puis rétabli la construction esbuild).
- `dts: false`: le `mion.d.mts` écrit à la main reste utilisé.
