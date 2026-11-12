// Type de l'expérience: union discriminée, Date, champ optionnel.
export interface Texte {
  kind: "texte";
  texte: string;
}

export interface Image {
  kind: "image";
  url: string;
  largeur: number;
}

export interface Message {
  id: string;
  /** Sur le fil JSON: chaîne ISO 8601. En mémoire: Date. */
  cree: Date;
  note?: string;
  contenu: Texte | Image;
}
