// Hash de la corrección (L-17 para correcciones): SHA-256 del registro canónico completo, encadenado por
// empresa, como las marcas. La corrección es un hecho nuevo que referencia la marca; nunca la edita.

import { hashEncadenado, jsonCanonico } from "@opai/domain";

import type { TipoMarca } from "./tipos";

export type RegistroCorreccion = {
  tenantId: string;
  seq: number;
  marcaId: string;
  personaId: string;
  horaPropuesta: Date;
  tipoPropuesto: TipoMarca;
  motivo: string;
  propuestaPorId: string;
  horaServidor: Date;
  plazoHoras: number;
  venceEn: Date;
  idempotencyKey: string;
  /** Documento de evidencia; solo entra al canon cuando existe (las correcciones previas conservan su hash). */
  evidenciaDocumentoId?: string;
};

export const canonDeCorreccion = (r: RegistroCorreccion): string => jsonCanonico({ v: 1, ...r });

export const hashDeCorreccion = (hashAnterior: string, r: RegistroCorreccion): Promise<string> =>
  hashEncadenado(hashAnterior, canonDeCorreccion(r));
