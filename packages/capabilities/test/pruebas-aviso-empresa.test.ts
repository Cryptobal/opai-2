// CAR-323 (D.3, decisión de Carlos del 12-nov-2026): el aviso de prueba por vencer también llega por correo
// a la empresa (dueños y administradores): a 7 días en las pruebas de Plataforma y a 2 en la prueba gratis.
import { describe, expect, it } from "vitest";

import { entradaCatalogo } from "@opai/domain";

import { consumidorAvisoPruebaEmpresa } from "../src/core/plataforma/cobros";
import { trabajoPruebasGratis } from "../src/core/pruebas-gratis";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const U3 = "0192f3a0-0000-7000-8000-0000000000a3";
const U4 = "0192f3a0-0000-7000-8000-0000000000a4";
const ev = (id: string, tipo: string, payload: Record<string, unknown>) => ({
  id,
  tipo,
  entidadTipo: "modulo",
  entidadId: null,
  payload,
  actorTipo: "system",
  actorId: null,
  viaUserId: null,
  createdAt: new Date(),
});

function contexto(extra: Record<string, unknown[]> = {}) {
  const s = semillaTenant("admin");
  return contextoDePrueba({
    semilla: {
      ...s,
      user: [
        ...s.user,
        { id: U3, name: "Carla", email: "carla@prueba.cl" },
        { id: U4, name: "Dani", email: "dani@prueba.cl" },
      ],
      membership: [
        ...s.membership,
        {
          id: "m3",
          tenantId: TENANT_DE_PRUEBA,
          userId: U3,
          rol: "viewer",
          portales: ["erp"],
          estado: "activa",
        },
        {
          id: "m4",
          tenantId: TENANT_DE_PRUEBA,
          userId: U4,
          rol: "admin",
          portales: ["erp"],
          estado: "inactiva",
        },
      ],
      ...extra,
    },
  });
}

describe("aviso a la empresa de prueba por vencer", () => {
  it("prueba de Plataforma: escribe a dueños y administradores activos, una sola vez", async () => {
    const { ctx, correos, tabla } = contexto();
    const e = ev("e1", "core.cobros.prueba_por_vencer", {
      moduloId: "cpq",
      pruebaHasta: "2026-11-20",
      pasaACobro: true,
    });
    await consumidorAvisoPruebaEmpresa.handler(ctx, e);
    await consumidorAvisoPruebaEmpresa.handler(ctx, e);
    expect(correos.map((c) => c.para).sort()).toEqual(["ana@prueba.cl", "beto@prueba.cl"]);
    expect(correos[0]?.asunto).toBe(
      `La prueba de ${entradaCatalogo("cpq")?.nombre} vence en 7 días`,
    );
    expect(correos[0]?.texto).toMatch(/20-11-2026.*pasará a cobro/s);
    expect(tabla("envio").filter((x) => x["estado"] === "enviado")).toHaveLength(2);
  });

  it("prueba gratis: el trabajo diario avisa dos días antes del último día, y solo ese día", async () => {
    const dia = "2026-11-12";
    const fila = (moduloId: string, hasta: string) => ({
      id: `p-${moduloId}`,
      tenantId: TENANT_DE_PRUEBA,
      moduloId,
      inicio: new Date("2026-11-05T00:00:00Z"),
      hasta: new Date(`${hasta}T00:00:00Z`),
      extensiones: 0,
      cerradaEn: null,
    });
    const { ctx, tabla } = contexto({
      pruebaGratis: [fila("cpq", "2026-11-14"), fila("tickets", "2026-11-15")],
    });
    expect(await trabajoPruebasGratis.ejecutar(ctx, { dia })).toMatchObject({ avisadas: ["cpq"] });
    const eventos = tabla("evento").filter((x) => x["tipo"] === "core.prueba_gratis.por_vencer");
    expect(eventos).toMatchObject([{ payload: { moduloId: "cpq", dias: 2 } }]);
  });

  it("prueba gratis: el correo dice que quedará en solo lectura", async () => {
    const { ctx, correos } = contexto();
    await consumidorAvisoPruebaEmpresa.handler(
      ctx,
      ev("e2", "core.prueba_gratis.por_vencer", {
        moduloId: "cpq",
        hasta: "2026-11-14T00:00:00.000Z",
        dias: 2,
      }),
    );
    expect(correos[0]?.asunto).toMatch(/2 días/);
    expect(correos[0]?.texto).toMatch(/14-11-2026.*solo lectura/s);
  });
});
