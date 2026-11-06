// CAR-222 PR 2 · Lo que la empresa ve en su ERP (`core.modules.pruebas`) y lo que Plataforma lee
// (`platform.cobros.pruebas_gratis_list`): precio de lista, estado de la prueba y por qué no se puede.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const fecha = (n: number) => new Date(`${dia(n)}T00:00:00Z`);
const modulo = (id: string, dependencias: string[] = []) =>
  defineModule({
    id,
    nombre: id,
    version: "0.1.0",
    dependencias,
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([modulo("cpq"), modulo("finanzas"), modulo("tickets")]);
});

const prueba = (moduloId: string, hasta: Date) => ({
  id: `p-${moduloId}`,
  tenantId: TENANT_DE_PRUEBA,
  moduloId,
  inicio: fecha(-9),
  hasta,
  extensiones: 0,
});
const rut = [{ tenantId: TENANT_DE_PRUEBA, rut: "76123456-0", razonSocial: "Gard SpA" }];

describe("core.modules.pruebas", () => {
  it("lista lo que se puede probar, con precio de lista, y deja fuera lo incluido en el plan base", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semillaTenant(),
        perfilEmpresa: rut,
        ajustePlataforma: [
          {
            modulo: "catalogo",
            clave: "cpq",
            valor: {
              moneda: "UF",
              forma: "fijo",
              unidad: null,
              precio: 50_000,
              minimoMensual: null,
            },
          },
        ],
      },
    });
    const r = await executeCapability(ctx, "core.modules.pruebas", {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ dias: 10, rutCompleto: true });
    const ids = r.data.items.map((i) => i.id);
    expect(ids).toContain("cpq");
    expect(ids).toContain("finanzas.bancos");
    expect(ids).not.toContain("tickets");
    expect(ids).not.toContain("base");
    expect(r.data.items.find((i) => i.id === "cpq")).toMatchObject({
      estado: "disponible",
      textoPrecio: expect.stringContaining("UF"),
    });
  });

  it("avisa que falta el RUT y marca vigente, vencida o no disponible", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semillaTenant(),
        tenantModule: [
          { id: "m1", tenantId: TENANT_DE_PRUEBA, moduloId: "cpq", estado: "trial" },
          { id: "m2", tenantId: TENANT_DE_PRUEBA, moduloId: "finanzas", estado: "activo" },
        ],
        pruebaGratis: [prueba("cpq", fecha(2))],
      },
    });
    const r = await executeCapability(ctx, "core.modules.pruebas", {});
    if (!r.ok) throw new Error(r.error.message);
    expect(r.data.rutCompleto).toBe(false);
    expect(r.data.items.find((i) => i.id === "cpq")).toMatchObject({
      estado: "en_prueba",
      diasRestantes: 3,
    });
    // Finanzas activo ya incluye todas sus partes.
    expect(r.data.items.find((i) => i.id === "finanzas.bancos")).toMatchObject({
      estado: "no_disponible",
      motivo: expect.stringContaining("incluye todas"),
    });
  });

  it("una prueba terminada queda «vencida» y se pide a OPAI", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semillaTenant(),
        perfilEmpresa: rut,
        tenantModule: [
          { id: "m1", tenantId: TENANT_DE_PRUEBA, moduloId: "cpq", estado: "solo_lectura" },
        ],
        pruebaGratis: [prueba("cpq", fecha(-1))],
      },
    });
    const r = await executeCapability(ctx, "core.modules.pruebas", {});
    if (!r.ok) throw new Error(r.error.message);
    expect(r.data.items.find((i) => i.id === "cpq")).toMatchObject({
      estado: "vencida",
      diasRestantes: 0,
      motivo: expect.stringContaining("OPAI"),
    });
  });
});
