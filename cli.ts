// Exécution des scripts en ligne de commande: une erreur s'affiche en un message clair,
// sans trace de pile, et donne le code de sortie 1.
export async function lancer(principal: () => Promise<void>): Promise<void> {
  try {
    await principal();
  } catch (e) {
    console.error(`Erreur: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
