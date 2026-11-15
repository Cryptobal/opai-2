// CAR-329: Plataforma › Ajustes guarda precios y ajustes de una sola vez. Si un cambio falla a la
// mitad, no queda guardado ninguno; la vista previa no escribe; el guardado deja un evento con antes
// y después en la auditoría global.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

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
    semilla: { ...s, user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)) },
  });
};

const precio = { tipo: "precio", recurso: "ia.economica.entrada", unidad: "token", costoUnitarioMicro: 3 };
const imm = { tipo: "ajuste", modulo: "core", clave: "remuneraciones_imm", valor: 560_000 };
const ID = "platform.ajustes.guardar_lote";

describe("platform.ajustes.guardar_lote (CAR-329)", () => {
  it("guarda precio y ajuste juntos, con un evento de auditoría global con antes y después", async () => {
    const { ctx, tabla } = contexto();
    const r = await executeCapability(ctx, ID, { cambios: [precio, imm] });
    expect(r).toMatchObject({ ok: true });
    expect(tabla("precioRecurso")).toHaveLength(1);
    expect(tabla("ajustePlataforma")).toHaveLength(1);
    const ev = tabla("auditoriaGlobal").filter((e) => e["capability"] === ID);
    expect(ev).toHaveLength(1);
    expect(ev[0]?.["despues"]).toEqual([
      { clave: "ia.economica.entrada", valor: expect.objectContaining({ costoUnitarioMicro: 3 }) },
      { clave: "core.remuneraciones_imm", valor: { valor: 560_000, version: 1 } },
    ]);
  });

  it("si un cambio falla a la mitad, no queda guardado ninguno", async () => {
    const { ctx, tabla } = contexto();
    const malo = { tipo: "ajuste", modulo: "core", clave: "no_existe", valor: 1 };
    const r = await executeCapability(ctx, ID, { cambios: [precio, imm, malo] });
    expect(r).toMatchObject({ ok: false });
    expect(tabla("precioRecurso")).toHaveLength(0);
    expect(tabla("ajustePlataforma")).toHaveLength(0);
    expect(tabla("auditoriaGlobal").filter((e) => e["capability"] === ID)).toHaveLength(0);
  });

  it("la vista previa revisa todo sin escribir", async () => {
    const { ctx, tabla } = contexto();
    const r = await executeCapability(ctx, ID, { cambios: [precio, imm] }, { dryRun: true });
    expect(r).toMatchObject({ ok: true, data: { cambios: [{ tipo: "precio" }, { tipo: "ajuste" }] } });
    expect(tabla("precioRecurso")).toHaveLength(0);
    expect(tabla("ajustePlataforma")).toHaveLength(0);
  });

  it("rechaza un cambio repetido", async () => {
    const { ctx } = contexto();
    expect(await executeCapability(ctx, ID, { cambios: [imm, imm] })).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("repetido") },
    });
  });
});
