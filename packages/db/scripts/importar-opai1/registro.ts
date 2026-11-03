// Registro de una corrida: qué hizo la importación con cada fila de 1.0 (para conciliar y revertir).
import type { TenantTx } from "../../src/transaccion";
import type { EntidadImportada } from "./destino-tipos";

export type Previos = Record<string, unknown>;

export interface Registro {
  creado(entidad: EntidadImportada, id10: string, id20: string): Promise<void>;
  /** Campos completados con su valor anterior (nulo si estaba vacío). */
  completado(entidad: EntidadImportada, id10: string, id20: string, previos: Previos): Promise<void>;
  sinCambio(entidad: EntidadImportada, id10: string, id20: string): Promise<void>;
  omitido(entidad: EntidadImportada, id10: string, motivo: string): Promise<void>;
}

/** Sin corrida (script o prueba): no registra nada. */
export const sinRegistro: Registro = {
  creado: () => Promise.resolve(),
  completado: () => Promise.resolve(),
  sinCambio: () => Promise.resolve(),
  omitido: () => Promise.resolve(),
};

/** Valores de fecha a texto para guardarlos en JSON y poder restaurarlos. */
function aJson(previos: Previos): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(previos).map(([k, v]) => [
      k,
      v instanceof Date ? `fecha:${v.toISOString()}` : (v as string | number | boolean | null),
    ]),
  );
}

export function registroEnCorrida(tx: TenantTx, tenantId: string, importacionId: string): Registro {
  const guardar = (
    entidad: EntidadImportada,
    id10: string,
    id20: string | null,
    accion: "creado" | "completado" | "sin_cambio" | "omitido",
    extra: { motivo?: string; previos?: Previos } = {},
  ) =>
    tx.importacionFila
      .upsert({
        where: { importacionId_entidad_id10: { importacionId, entidad, id10 } },
        create: {
          tenantId,
          importacionId,
          entidad,
          id10,
          id20,
          accion,
          motivo: extra.motivo ?? null,
          ...(extra.previos ? { previos: aJson(extra.previos) } : {}),
        },
        // Reanudar una corrida no degrada lo ya hecho: «creado» y «completado» se conservan.
        update: {},
      })
      .then(() => undefined);
  return {
    creado: (e, i, d) => guardar(e, i, d, "creado"),
    completado: (e, i, d, previos) => guardar(e, i, d, "completado", { previos }),
    sinCambio: (e, i, d) => guardar(e, i, d, "sin_cambio"),
    omitido: (e, i, motivo) => guardar(e, i, null, "omitido", { motivo }),
  };
}

export function previosDeFecha(valor: unknown): unknown {
  return typeof valor === "string" && valor.startsWith("fecha:") ? new Date(valor.slice(6)) : valor;
}
