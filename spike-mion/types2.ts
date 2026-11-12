// Cas non couverts par types.ts: récursion, union avec Date, Map, union d'objet et de Date.
export interface Noeud {
  nom: string;
  enfants: Noeud[];
}

export interface UnionDate {
  quand: Date | string;
}

export interface Compteurs {
  valeurs: Map<string, number>;
}

export interface Melange {
  contenu: { kind: "a"; x: number } | Date;
}
