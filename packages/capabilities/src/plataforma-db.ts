// Acceso de plataforma real del Contexto (ADR-055, CAR-36, CAR-40): globales con nombre, operaciones
// acotadas por empresa y la auditoría en la empresa objetivo.
import { enTransaccion, forTenant, type Globales } from "@opai/db";

import { empresaDePlataforma } from "./plataforma-empresa";
import { auditoriaEnDb } from "./servicios-db";
import type { Plataforma } from "./types";

/** `acceso` es `accesoPlataforma` de @opai/db, que solo contexto.ts puede importar (lint). */
export function plataformaEnDb(acceso: () => Globales): Plataforma {
  return {
    globales: acceso(),
    empresa: (id: string) => empresaDePlataforma(forTenant(id), id),
    auditarEnObjetivo: (id, hecho, evento) =>
      enTransaccion(id, async (tx) => {
        await acceso().auditarPlataforma(hecho, tx);
        await auditoriaEnDb(id).registrar(tx, evento);
      }),
  };
}
