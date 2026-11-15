import { after } from "next/server";

import { crearContexto, despacharPendientes, medidorEnDb, type Medidor } from "@opai/capabilities";

import { fuentesReales, type Fuentes } from "./fuentes";
import { asegurarRegistro } from "./registro";

/** Medición fuera del request (`after()`), para no retrasar respuestas (ADR-031). */
export const medidorDiferido: Medidor = {
  preparar: (c) => medidorEnDb.preparar!(c),
  async registrar(consumo) {
    if (consumo.apiKeyId) return medidorEnDb.registrar(consumo);
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

/**
 * Contexto de sistema con los módulos activos de la empresa (CAR-441).
 * Sin ellos, consumidores y trabajos que miran `ctx.modulosActivos` se saltan su trabajo.
 */
export async function contextoSistemaDelTenant(
  tenantId: string,
  fuentes: Pick<Fuentes, "modulosActivos"> = fuentesReales,
) {
  return contextoSistema(tenantId, await fuentes.modulosActivos(tenantId));
}

/** Tras una escritura, despacha el outbox del tenant fuera de la respuesta (ADR-029). */
export const despacharDiferido = (tenantId: string) => () =>
  diferirConAfter(async () => despacharPendientes(await contextoSistemaDelTenant(tenantId)));
