// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
import assert from "node:assert/strict";
import { test } from "node:test";
import { depotDepuis, lierVoirAussi, nomLogiciel, pageEnrichissement } from "../logiciel.ts";
import { enrichi, outil } from "../../commun/test/donnees-fictives.ts";

const service = (nom: string, logiciel: string, url: string) => outil(nom, { source_repertoire_id: "facil", score_estime: true, instance_de: { nom: logiciel, url } });

test("nomLogiciel: le logiciel dont l'outil est une instance, sinon le nom de l'outil", () => {
  assert.equal(nomLogiciel(service("Planète FACiLe", "BilboPlanet", "https://github.com/theclimber/Bilboplanet")), "BilboPlanet");
  assert.equal(nomLogiciel(outil("Jami")), "Jami");
});

test("depotDepuis: racine du dépôt pour une page de version, de tag ou de commit sur GitHub, Codeberg, GitLab et Framagit; null hors forge ou URL invalide", () => {
  assert.equal(depotDepuis("https://github.com/mastodon/mastodon/releases/tag/v4.7.1"), "https://github.com/mastodon/mastodon");
  assert.equal(depotDepuis("https://github.com/CollaboraOnline/online/commits/e724e42045"), "https://github.com/CollaboraOnline/online");
  assert.equal(depotDepuis("https://github.com/theclimber/Bilboplanet"), "https://github.com/theclimber/Bilboplanet");
  assert.equal(depotDepuis("https://codeberg.org/LiberaForms/server/releases/tag/v4.9.2"), "https://codeberg.org/LiberaForms/server");
  assert.equal(depotDepuis("https://gitlab.com/gitlab-org/gitlab-foss/-/tags/v18.11.11"), "https://gitlab.com/gitlab-org/gitlab-foss");
  assert.equal(depotDepuis("https://framagit.org/fiat-tux/hat-softwares/lstu/-/tags/0.28-0"), "https://framagit.org/fiat-tux/hat-softwares/lstu", "sous-groupes GitLab conservés");
  assert.equal(depotDepuis("https://framagit.org/framasoft/framadate/framadate/tags/1.1.19"), "https://framagit.org/framasoft/framadate/framadate", "ancienne forme sans /-/");
  assert.equal(depotDepuis("https://framagit.org/agenda-libre/agenda-libre-ruby"), "https://framagit.org/agenda-libre/agenda-libre-ruby");
  assert.equal(depotDepuis("https://git.jami.net/savoirfairelinux/jami-project/-/tags/v1"), "https://git.jami.net/savoirfairelinux/jami-project", "forge auto-hébergée git.*: traitée comme GitLab");
  assert.equal(depotDepuis("https://nextcloud.com/changelog/#latest32"), null);
  assert.equal(depotDepuis("https://www.mediawiki.org/wiki/MediaWiki_1.43"), null);
  assert.equal(depotDepuis("https://github.com/seul"), null, "il faut une organisation et un dépôt");
  assert.equal(depotDepuis("pas une url"), null);
});

test("pageEnrichissement: le dépôt du logiciel (normalisé) quand l'outil en est une instance, la page telle quelle hors forge, sinon le lien de l'outil", () => {
  assert.equal(pageEnrichissement(service("Jasette FACiLe", "Mastodon", "https://github.com/mastodon/mastodon/releases/tag/v4.7.1")), "https://github.com/mastodon/mastodon");
  assert.equal(pageEnrichissement(service("Nuage FACiLe", "NextCloud", "https://nextcloud.com/changelog/#latest32")), "https://nextcloud.com/changelog/#latest32");
  assert.equal(pageEnrichissement(outil("Jami")), "https://Jami.example/");
});

test("lierVoirAussi: les outils d'un même logiciel (nom ou instance_de.nom, casse et espaces ignorés) se renvoient l'un à l'autre; seuls, retirés ou déjà à jour: rien ne change", () => {
  const mastodon = enrichi("Mastodon");
  const jasette = service("Jasette FACiLe", "mastodon", "https://github.com/mastodon/mastodon");
  const parlote = service("Parlote FACiLe", "Diaspora", "https://github.com/diaspora/diaspora");
  const seul = outil("Seul");
  const retire = outil("Mastodon retiré", { removed: true, instance_de: { nom: "Mastodon", url: "https://x.example/" } });
  const { outils, relies } = lierVoirAussi([mastodon, jasette, parlote, seul, retire]);
  assert.equal(relies, 2);
  assert.deepEqual(outils.map((o) => o.voir_aussi), [["Jasette FACiLe"], ["Mastodon"], undefined, undefined, undefined]);
  assert.equal(outils[2], parlote, "un outil sans renvoi garde son identité");
  const encore = lierVoirAussi(outils);
  assert.equal(encore.relies, 0);
  assert.equal(encore.outils[0], outils[0]);
  const perime = lierVoirAussi([{ ...seul, voir_aussi: ["Disparu"] }]);
  assert.equal(perime.relies, 1);
  assert.equal(perime.outils[0]!.voir_aussi, undefined, "un renvoi périmé est retiré");
  const trois = lierVoirAussi([outil("Nextcloud"), service("Nuage FACiLe", "NextCloud", "https://nextcloud.com/"), outil("Nuage maison", { instance_de: { nom: "Nextcloud ", url: "https://y.example/" } })]);
  assert.deepEqual(trois.outils[0]!.voir_aussi, ["Nuage FACiLe", "Nuage maison"]);
  assert.deepEqual(trois.outils[2]!.voir_aussi, ["Nextcloud", "Nuage FACiLe"]);
});
