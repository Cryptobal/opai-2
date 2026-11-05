// CAR-188 · Conteo de unidades y cobro por unidad con mínimo, plan base y cantidad guardada.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { contarUnidades, type DatosUnidades } from "../src/core/plataforma/cobros/unidades";
import { executeCapability } from "../src/execute";
import { limpiarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const miembro = (
  rol: string,
  excepciones: DatosUnidades["miembros"][number]["excepciones"] = [],
) => ({
  rol,
  roleId: null,
  rolTenant: null,
  excepciones,
});

describe("contarUnidades", () => {
  const datos: DatosUnidades = {
    miembros: [
      miembro("owner"),
      miembro("supervisor"),
      miembro("viewer"),
      miembro("viewer", [{ permiso: "rendiciones:rendir", conceder: true }]),
      miembro("supervisor", [{ permiso: "rendiciones:rendir", conceder: false }]),
    ],
    trabajadores: 12,
    instalaciones: 3,
  };

  it("cuenta usuarios activos, los que rinden (con excepciones), trabajadores e instalaciones", () => {
    expect(contarUnidades(datos, "usuario_activo", "rendiciones")).toBe(5);
    // owner y supervisor rinden; viewer no, salvo la excepción que concede; la que deniega gana.
    expect(contarUnidades(datos, "usuario_rinde", "rendiciones")).toBe(3);
    expect(contarUnidades(datos, "trabajador_activo", "nomina")).toBe(12);
    expect(contarUnidades(datos, "instalacion_activa", "operaciones")).toBe(3);
  });
});

describe("platform.cobros por unidad", () => {
  beforeEach(() => {
    limpiarRegistro();
    limpiarModulos();
    registrarCapacidades(capacidadesDelNucleo);
  });
  const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
  const contexto = () => {
    const s = semillaTenant();
    return contextoDePrueba({
      usuario: owner,
      semilla: {
        ...s,
        user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
        ufPublicada: [{ id: "uf1", desde: new Date("2026-10-31T00:00:00Z"), centavos: 3_900_000 }],
      },
      conTenant: false,
      rol: null,
    });
  };

  it("el plan base se cobra en UF completo y sin módulos contratados", async () => {
    const { ctx } = contexto();
    const set = await executeCapability(ctx, "platform.cobros.condiciones_set", {
      tenantId: TENANT_DE_PRUEBA,
      moduloId: "base",
      condicion: { precio: "3", cobroDesde: "2026-01-01" },
    });
    expect(set).toMatchObject({ ok: true, data: { despues: { forma: "fijo", moneda: "UF" } } });
    const gen = await executeCapability(ctx, "platform.cobros.cargos_generar", {
      periodo: "2026-10",
      tenantId: TENANT_DE_PRUEBA,
    });
    // 3 UF × $39.000 = $117.000.
    expect(gen).toMatchObject({ ok: true, data: { creados: 1, montoClp: 117_000 } });
  });

  it("por unidad: cantidad × precio, mínimo y después el descuento; guarda la cantidad", async () => {
    const { ctx } = contexto();
    // Los 2 usuarios activos de la semilla × 0,5 UF = 1 UF < mínimo 4 UF; −25 % = 3 UF.
    await executeCapability(ctx, "platform.cobros.condiciones_set", {
      tenantId: TENANT_DE_PRUEBA,
      moduloId: "base",
      condicion: {
        forma: "por_unidad",
        unidad: "usuario_activo",
        precio: "0,5",
        minimoMensual: "4",
        descuentoPorcentaje: 25,
        cobroDesde: "2026-01-01",
      },
    });
    const gen = { periodo: "2026-10", tenantId: TENANT_DE_PRUEBA };
    expect(await executeCapability(ctx, "platform.cobros.cargos_generar", gen)).toMatchObject({
      data: { creados: 1, montoClp: 117_000 },
    });
    const lista = await executeCapability(ctx, "platform.cobros.cargos_list", {
      tenantId: TENANT_DE_PRUEBA,
    });
    expect(lista).toMatchObject({
      ok: true,
      data: [{ forma: "por_unidad", unidad: "usuario_activo", cantidad: 2, monto: 30_000 }],
    });
  });

  it("rechaza el cobro por unidad sin unidad y una unidad desconocida", async () => {
    const { ctx } = contexto();
    const caso = (extra: Record<string, unknown>) =>
      executeCapability(ctx, "platform.cobros.condiciones_set", {
        tenantId: TENANT_DE_PRUEBA,
        moduloId: "base",
        condicion: { forma: "por_unidad", precio: "1", cobroDesde: "2026-01-01", ...extra },
      });
    expect(await caso({})).toMatchObject({ ok: false });
    expect(await caso({ unidad: "mascotas" })).toMatchObject({ ok: false });
  });
});
