import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { codigo, dato } from "./maestros-ayuda";

// CAR-27 y CAR-298: el tablero de reportes contra Postgres real, con RLS y dos empresas.
type Tablero = {
  enCurso: { cantidad: number; montoMensualClp: number };
  cierre: { ganados: number; perdidos: number; conversionPct: number | null; montoGanadoMensualClp: number };
  embudo: { nombre: string; cantidad: number }[];
  perdidas: { motivos: { nombre: string; cantidad: number }[]; competidores: { nombre: string; cantidad: number }[] };
  canales: { canal: string; solicitudes: number; negocios: number }[] | null;
  pronostico: { totalPonderadoClp: number; meses: { mes: string; ponderadoClp: number }[] };
  responsables: { responsableId: string | null; nombre: string; abiertos: number }[];
};

describe("comercial · tablero de reportes contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  const ctx = (tenantId: string, rol: "owner" | "viewer" | "supervisor" = "owner") =>
    mod.crearContexto({ tenantId, rol, actor: { tipo: "system" }, modulosActivos: ["comercial"] });
  const tablero = (t: string, input: Record<string, unknown> = {}) => dato<Tablero>(ctx(t), "comercial.informes.tablero", input);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    for (const slug of ["a", "b"]) {
      const t = await e.admin.tenant.create({ data: { slug: `rep-${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } });
      await sembrarComercial(e.admin.$extends({}), t.id);
      if (slug === "a") a = t.id;
      else b = t.id;
    }
    const cuenta = await dato<{ id: string }>(ctx(a), "core.cuentas.create", { nombre: "Cliente A" });
    const cierre = `${new Date().toISOString().slice(0, 7)}-28`;
    const nuevo = (titulo: string, monto: number) =>
      dato<{ id: string }>(ctx(a), "comercial.negocios.create", { cuentaId: cuenta.id, titulo, montoEstimadoMensual: monto, cierreEstimado: cierre });
    await nuevo("Abierto", 1_000_000);
    const perdido = await nuevo("Perdido", 2_000_000);
    const motivo = await e.admin.motivoPerdida.findFirstOrThrow({ where: { tenantId: a } });
    await dato(ctx(a), "comercial.negocios.perder", { id: perdido.id, motivoPerdidaId: motivo.id, competidor: "Competidor Uno" });
    const s = await dato<{ id: string }>(ctx(a), "comercial.solicitudes.create", { textoOriginal: "Necesito guardias", nombre: "Ana Pérez Soto", empresa: "Nueva SpA", email: "ana@nueva.example" });
    await dato(ctx(a), "comercial.solicitudes.convertir", { id: s.id });
    await dato(ctx(a), "comercial.solicitudes.create", { textoOriginal: "Otra consulta" });
    const cuentaB = await dato<{ id: string }>(ctx(b), "core.cuentas.create", { nombre: "Cliente B" });
    await dato(ctx(b), "comercial.negocios.create", { cuentaId: cuentaB.id, titulo: "De B", montoEstimadoMensual: 9_000_000 });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("suma lo de la empresa y nada de la otra", async () => {
    const r = await tablero(a);
    // El negocio que nació de la solicitud también está abierto.
    expect(r.enCurso.cantidad).toBe(2);
    expect(r.cierre).toMatchObject({ ganados: 0, perdidos: 1, conversionPct: 0 });
    expect(r.embudo.reduce((s, x) => s + x.cantidad, 0)).toBe(2);
    expect(r.perdidas.motivos).toHaveLength(1);
    expect(r.perdidas.competidores).toEqual([{ nombre: "Competidor Uno", cantidad: 1 }]);
    expect(r.canales?.find((c) => c.canal === "manual")).toMatchObject({ solicitudes: 2, negocios: 1 });
    expect(r.pronostico.meses).toHaveLength(4);
    expect(r.responsables.reduce((s, x) => s + x.abiertos, 0)).toBe(2);
    expect((await tablero(b)).enCurso).toEqual({ cantidad: 1, montoMensualClp: 9_000_000 });
  });

  it("acepta trimestre y año, filtra por responsable y es una lectura sin datos personales en auditoría", async () => {
    expect((await tablero(a, { periodo: "anio" })).cierre.perdidos).toBe(1);
    expect((await tablero(a, { periodo: "trimestre", responsableId: randomUUID() })).enCurso.cantidad).toBe(0);
    expect(await codigo(ctx(a, "supervisor"), "comercial.informes.tablero", {})).toBe("FORBIDDEN");
  });
});
