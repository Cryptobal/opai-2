// CAR-188 PR 2: correo a los usuarios de plataforma cuando una prueba vence en siete días.
import { describe, expect, it } from "vitest";

import { consumidorAvisoPrueba } from "../src/core/plataforma/cobros";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const ev = (id: string) => ({
  id,
  tipo: "core.cobros.prueba_por_vencer",
  entidadTipo: null,
  entidadId: null,
  payload: { moduloId: "crm", pruebaHasta: "2026-11-09", pasaACobro: false },
  actorTipo: "system",
  actorId: null,
  viaUserId: null,
  createdAt: new Date(),
});

function contexto() {
  const s = semillaTenant();
  return contextoDePrueba({
    semilla: {
      ...s,
      user: s.user.map((u) => ({
        ...u,
        platformRole: u.id === USUARIO_DE_PRUEBA.id ? "owner" : null,
      })),
      tenant: [{ id: TENANT_DE_PRUEBA, nombre: "Gard", slug: "gard", estado: "activo" }],
    },
  });
}

describe("consumidor core.cobros.avisar_prueba_por_vencer", () => {
  it("escribe solo a los usuarios de plataforma y no repite el mismo evento", async () => {
    const { ctx, correos, tabla } = contexto();
    await consumidorAvisoPrueba.handler(ctx, ev("e1"));
    await consumidorAvisoPrueba.handler(ctx, ev("e1"));
    expect(correos.map((c) => c.para)).toEqual([USUARIO_DE_PRUEBA.email]);
    expect(correos[0]?.asunto).toMatch(/crm.*Gard.*7 días/);
    expect(correos[0]?.texto).toMatch(/solo lectura/);
    expect(tabla("envio")).toMatchObject([{ estado: "enviado", eventoId: "e1" }]);
  });
});
