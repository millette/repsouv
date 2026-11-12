import {
  createJsonDecoderFn,
  createJsonSchemaFn,
  createValidateFn,
  createGetValidationErrorsFn,
} from "@mionjs/run-types";
import type { Message } from "./types.ts";

export const schemaMion = createJsonSchemaFn<Message>();
export const estMessage = createValidateFn<Message>();
export const erreursMessage = createGetValidationErrorsFn<Message>();
export const decoderJson = createJsonDecoderFn<Message>();

export const estMessageStrict = createValidateFn<Message>(undefined, { checkUnknowns: true });
