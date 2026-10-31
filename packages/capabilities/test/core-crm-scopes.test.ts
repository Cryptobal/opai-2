import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { CU, N1, reiniciarComercial, semillaComercial } from "./comercial-ayuda";
import { codigo, dato } from "./maestros-ayuda";

beforeEach(reiniciarComercial);

const A = "0192f3a0-0000-7000-8000-000000000011";
function actor(scopes: string[] | null, modulosActivos: string[]) {
  return contextoDePrueba({
    scopes,
    modulosActivos,
    semilla: {
      ...semillaComercial({ conNegocio: true }),
      actividad: [
        {
          id: A,
          tenantId: TENANT_DE_PRUEBA,
          tipo: "nota",
          titulo: "Seguimiento",
          detalle: null,
          ocurrioEn: new Date("2026-01-01T00:00:00Z"),
          todoElDia: false,
          asistentes: [],
          acuerdos: null,
          proximoPaso: null,
          prioridad: null,
          estado: null,
          completadaEn: null,
          completadaPorId: null,
          vencimiento: null,
          creadaPorId: USUARIO_DE_PRUEBA.id,
        },
      ],
      actividadVinculo: [
        {
          id: A,
          tenantId: TENANT_DE_PRUEBA,
          actividadId: A,
          negocioId: N1,
          cuentaId: null,
          contactoId: null,
          instalacionId: null,
        },
        {
          id: CU,
          tenantId: TENANT_DE_PRUEBA,
          actividadId: A,
          negocioId: null,
          cuentaId: CU,
          contactoId: null,
          instalacionId: null,
        },
      ],
    },
  }).ctx;
}

const negocio = { entidadTipo: "negocio", entidadId: N1 };
const cuenta = { entidadTipo: "cuenta", entidadId: CU };

describe("CRM: permiso, scope y módulo activo son requisitos independientes", () => {
  it.each([
    { nombre: "key de otro módulo", scopes: ["core"], modulos: ["comercial"] },
    { nombre: "Comercial inactivo", scopes: ["core", "comercial"], modulos: [] },
  ])("$nombre: rechaza negocios y oculta actividades vinculadas", async ({ scopes, modulos }) => {
    const ctx = actor(scopes, modulos);
    expect(ctx.autorizar("comercial:negocios.read")).toBe(true);
    expect(await codigo(ctx, "core.actividades.timeline", negocio)).toBe("FORBIDDEN");
    expect(await codigo(ctx, "core.etiquetas.de_entidad", negocio)).toBe("FORBIDDEN");
    const timeline = await dato<{ items: { id: string }[] }>(
      ctx,
      "core.actividades.timeline",
      cuenta,
    );
    expect(timeline.items).toEqual([]);
    for (const dryRun of [false, true]) {
      expect(
        await codigo(
          ctx,
          "core.actividades.create",
          {
            tipo: "nota",
            titulo: "Nueva",
            vinculos: [{ tipo: "negocio", id: N1 }],
          },
          { dryRun },
        ),
      ).toBe("FORBIDDEN");
      expect(
        await codigo(ctx, "core.actividades.update", { id: A, titulo: "Cambio" }, { dryRun }),
      ).toBe("NOT_FOUND");
    }
  });

  it.each([{ scopes: ["core", "comercial"] }, { scopes: ["*"] }, { scopes: null }])(
    "con scope permitido y módulo activo lee el negocio (%j)",
    async ({ scopes }) => {
      const ctx = actor(scopes, ["comercial"]);
      for (const input of [negocio, cuenta]) {
        const timeline = await dato<{ items: { id: string }[] }>(
          ctx,
          "core.actividades.timeline",
          input,
        );
        expect(timeline.items.map((a) => a.id)).toEqual([A]);
      }
    },
  );
});
