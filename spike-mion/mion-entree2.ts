import {
  createJsonDecoderFn,
  createJsonEncoderFn,
  createJsonSchemaFn,
  createValidateFn,
} from "@mionjs/run-types";
import type { Compteurs, Melange, Noeud, UnionDate } from "./types2.ts";

export const noeud = {
  schema: createJsonSchemaFn<Noeud>(),
  valide: createValidateFn<Noeud>(),
  encoder: createJsonEncoderFn<Noeud>(),
  decoder: createJsonDecoderFn<Noeud>(),
};
export const unionDate = {
  schema: createJsonSchemaFn<UnionDate>(),
  valide: createValidateFn<UnionDate>(),
  encoder: createJsonEncoderFn<UnionDate>(),
  decoder: createJsonDecoderFn<UnionDate>(),
};
export const compteurs = {
  schema: createJsonSchemaFn<Compteurs>(),
  valide: createValidateFn<Compteurs>(),
  encoder: createJsonEncoderFn<Compteurs>(),
  decoder: createJsonDecoderFn<Compteurs>(),
};
export const melange = {
  schema: createJsonSchemaFn<Melange>(),
  valide: createValidateFn<Melange>(),
  encoder: createJsonEncoderFn<Melange>(),
  decoder: createJsonDecoderFn<Melange>(),
};
