// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Robin Millette <https://robin.millette.info/>
// Dans l'explorateur, le nom d'un outil est un lien vers sa fiche qui, avec JavaScript, ouvre ses détails dans une
// boîte sans quitter la page (specs/002-explorateur-outils, troisième amendement du 2026-11-13). Seul un clic simple
// est détourné: avec Ctrl, Cmd, Maj ou Alt, ou d'un autre bouton, le navigateur suit le lien comme partout ailleurs
// (nouvel onglet, nouvelle fenêtre, téléchargement).

/** Ce qu'il faut d'un clic pour en juger; un MouseEvent convient. */
export interface Clic {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Vrai pour un clic du bouton principal sans touche de modification (la touche Entrée sur un lien en produit un). */
export function clicSimple(clic: Clic): boolean {
  return clic.button === 0 && !clic.ctrlKey && !clic.metaKey && !clic.shiftKey && !clic.altKey;
}
