// CAR-174: rentabilidad por instalación con costo laboral estimado. Solo datos ficticios (empresas qa-rent*).
// Los valores legales se inyectan (juego de referencia del dominio) para no sembrar publicaciones globales.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { costoEmpleadorPorPersona, juegoDeValores } from "@opai/domain";

import { manifest } from "../../../modules/finanzas/manifest";
import { publicacionesReferencia } from "../../domain/src/remuneraciones/referencia.fixture";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";
import { costosDePuestos } from "../src/finanzas/rentabilidad-costos";

import type * as Mod from "../src";

type Fila = { instalacionId: string | null; nombre: string; ventasNetasClp: number; costoEstimadoClp: number; puestos: number; puestosSinCosto: number; puestosOcultos: number };

describe.skipIf(omitirSuiteDb())("finanzas.rentabilidad.get (db)", () => {
  let e: Entorno, mod: typeof Mod;
  const t = { a: "", b: "" };
  const i = { norte: "", sur: "" };
  const usuario = randomUUID();
  const ctx = (tid: string, permisosRol?: string[]) =>
    mod.crearContexto({
      ...(permisosRol ? { permisosRol } : {}),
      tenantId: tid, actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@rent.test", platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-renta")).id;
    t.b = (await mk("qa-rentb")).id;
    const cuenta = await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cliente ficticio" } });
    i.norte = (await e.admin.instalacion.create({ data: { tenantId: t.a, cuentaId: cuenta.id, nombre: "Bodega Norte ficticia" } })).id;
    i.sur = (await e.admin.instalacion.create({ data: { tenantId: t.a, cuentaId: cuenta.id, nombre: "Planta Sur ficticia" } })).id;
    const guardia = await e.admin.cargo.create({ data: { tenantId: t.a, nombre: "Guardia" } });
    const jefe = await e.admin.cargo.create({ data: { tenantId: t.a, nombre: "Jefe", sueldoSensible: true } });
    const puesto = (instalacionId: string, cargoId: string, nombre: string) =>
      e.admin.puesto.create({ data: { tenantId: t.a, instalacionId, cargoId, nombre, diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00", horasSemanales: 42 } });
    const p1 = await puesto(i.norte, guardia.id, "Guardia día");
    const p2 = await puesto(i.norte, jefe.id, "Jefe de turno");
    await puesto(i.sur, guardia.id, "Guardia sin sueldo");
    await e.admin.puesto.create({ data: { tenantId: t.a, instalacionId: i.sur, cargoId: guardia.id, nombre: "Inactivo", diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00", estado: "inactivo" } });
    for (const [puestoId, sueldoBase] of [[p1.id, 553_553], [p2.id, 900_000]] as const)
      await e.admin.estructuraSueldo.create({ data: { tenantId: t.a, nivel: "puesto", puestoId, sueldoBase, colacion: 20_000, movilizacion: 20_000, gratificacion: "legal_25", vigenteDesde: new Date("2026-01-01") } });
    const doc = (tenantId: string, cuentaId: string, instalacionId: string | null, tipoDte: number, montoNeto: number, fecha: string, estadoDte = "aceptado") =>
      e.admin.documentoEmitido.create({ data: { tenantId, cuentaId, instalacionId, tipoDte, montoNeto, montoTotal: montoNeto, estadoDte, fechaEmision: new Date(fecha) } });
    await doc(t.a, cuenta.id, i.norte, 33, 2_000_000, "2026-10-10");
    await doc(t.a, cuenta.id, i.norte, 61, 500_000, "2026-10-20");
    await doc(t.a, cuenta.id, null, 33, 100_000, "2026-10-05");
    await doc(t.a, cuenta.id, i.norte, 33, 9_000_000, "2026-10-15", "borrador");
    await doc(t.a, cuenta.id, i.norte, 33, 6_000_000, "2026-10-16", "rechazado");
    await doc(t.a, cuenta.id, i.norte, 33, 7_000_000, "2026-11-01");
    const cuentaB = await e.admin.cuenta.create({ data: { tenantId: t.b, nombre: "Otra" } });
    await doc(t.b, cuentaB.id, null, 33, 8_000_000, "2026-10-10");
  });
  afterAll(async () => { await e?.cerrar(); });

  it("estima el costo de cada puesto con su capa; sin permiso de sueldos queda oculto", async () => {
    const juego = await juegoDeValores("2026-10-31", publicacionesReferencia());
    const esperado = costoEmpleadorPorPersona(
      { sueldo: { sueldoBaseClp: 553_553, gratificacion: "legal_25", colacionClp: 20_000, movilizacionClp: 20_000, haberes: [] }, contrato: "indefinido", afp: "modelo", salud: { tipo: "fonasa" }, jornadaMinutosSemanales: 42 * 60, mutualAdicional: 0,
        provisiones: { diasVacacionesCorridosAnuales: 21, baseVacaciones: "sin_gratificacion", baseIndemnizacion: "imponible", mesesAntiguedad: 0, probabilidadIndemnizacion: 1_000_000 } },
      juego,
    ).costoEmpresaMensualClp;
    const conSensible = await costosDePuestos(ctx(t.a), "2026-10-01", "2026-11-01", "2026-10-31", juego);
    const norte = conSensible.costos.filter((c) => c.instalacionId === i.norte);
    expect(norte.filter((c) => c.estado === "ok")).toHaveLength(2);
    expect(norte).toContainEqual({ instalacionId: i.norte, estado: "ok", costoClp: esperado });
    expect(conSensible.costos.filter((c) => c.instalacionId === i.sur)).toEqual([{ instalacionId: i.sur, estado: "sin_costo" }]);
    // Sin core:estructuras.read_sensible ningún monto de sueldo se usa (D7): quedan ocultos, no sin costo.
    const sinSensible = await costosDePuestos(ctx(t.a, ["finanzas:read", "core:estructuras.read"]), "2026-10-01", "2026-11-01", "2026-10-31", juego);
    expect(sinSensible.costos.filter((c) => c.instalacionId === i.norte).map((c) => c.estado)).toEqual(["oculto", "oculto"]);
    expect(sinSensible.costos.filter((c) => c.instalacionId === i.sur).map((c) => c.estado)).toEqual(["sin_costo"]);
  });

  it("suma ventas netas del mes por instalación, sin borradores ni otra empresa", async () => {
    const r = await mod.executeCapability(ctx(t.a), "finanzas.rentabilidad.get", { mes: "2026-10" }, {});
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const d = r.data as { origenCosto: string; corte: string; totales: { ventasNetasClp: number }; instalaciones: Fila[] };
    expect(d).toMatchObject({ origenCosto: "estimado", corte: "2026-10-31" });
    expect(d.totales.ventasNetasClp).toBe(1_600_000);
    const norte = d.instalaciones.find((f) => f.instalacionId === i.norte);
    expect(norte).toMatchObject({ nombre: "Bodega Norte ficticia", ventasNetasClp: 1_500_000, puestos: 2 });
    expect(d.instalaciones.find((f) => f.instalacionId === null)).toMatchObject({ nombre: "Sin instalación", ventasNetasClp: 100_000 });
    expect(d.instalaciones.find((f) => f.instalacionId === i.sur)).toMatchObject({ puestos: 1, ventasNetasClp: 0 });
    const b = await mod.executeCapability(ctx(t.b), "finanzas.rentabilidad.get", { mes: "2026-10" }, {});
    expect(b.ok && (b.data as { totales: { ventasNetasClp: number } }).totales.ventasNetasClp).toBe(8_000_000);
  });

  it("sin permiso de sueldos no muestra margen (sería engañoso)", async () => {
    const r = await mod.executeCapability(ctx(t.a, ["finanzas:read", "core:estructuras.read"]), "finanzas.rentabilidad.get", { mes: "2026-10" }, {});
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const d = r.data as { totales: { margenClp: number | null; puestosOcultos: number }; instalaciones: (Fila & { margenClp: number | null })[] };
    expect(d.totales.margenClp).toBeNull();
    expect(d.instalaciones.find((f) => f.instalacionId === i.norte)).toMatchObject({ margenClp: null, costoEstimadoClp: 0 });
  });

  it("exige permiso de Finanzas y no acepta meses futuros", async () => {
    expect(await mod.executeCapability(ctx(t.a, ["rendiciones:rendir"]), "finanzas.rentabilidad.get", { mes: "2026-10" }, {})).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await mod.executeCapability(ctx(t.a), "finanzas.rentabilidad.get", { mes: "2999-01" }, {})).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});
