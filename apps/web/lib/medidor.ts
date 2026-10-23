import { after } from "next/server";

import { crearContexto, despacharPendientes, medidorEnDb, type Medidor } from "@opai/capabilities";

import { asegurarRegistro } from "./registro";

/** Medición fuera del request (`after()`), para no retrasar respuestas (ADR-031). */
export const medidorDiferido: Medidor = {
  async registrar(consumo) {
    after(() => medidorEnDb.registrar(consumo).catch(() => undefined));
  },
};

/** Trabajo diferido del borde: corre tras enviar la respuesta y nunca la rompe. */
export const diferirConAfter = (tarea: () => Promise<unknown>) =>
  after(() =>
    tarea()
      .then(() => undefined)
      .catch(() => undefined),
  );

/** Contexto de sistema de un tenant (crons, consumidores, despacho del outbox). */
export function contextoSistema(tenantId: string, modulosActivos: readonly string[] = []) {
  asegurarRegistro();
  return crearContexto({
    tenantId,
    actor: { tipo: "system" },
    portal: null,
    modulosActivos,
    medidor: medidorEnDb,
  });
}

/** Tras una escritura, despacha el outbox del tenant fuera de la respuesta (ADR-029). */
export const despacharDiferido = (tenantId: string) => () =>
  diferirConAfter(() => despacharPendientes(contextoSistema(tenantId)));
