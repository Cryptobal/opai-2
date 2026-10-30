// Operaciones · Pauta PR 1 (CAR-81): aislamiento entre tenants, flujo de series/excepciones, alcance
// del supervisor y «prohibido doblar» contra Postgres real (si hay DATABASE_URL_TEST).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("Pauta · series, excepciones y aislamiento (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantA = "";
  let tenantB = "";
  let instA = "";
  let instA2 = "";
  let instB = "";
  let puestoDia = "";
  let puestoNoche = "";
  let puestoB = "";
  let puestoOtraInst = "";
  let patron4x4 = "";
  let patron5x2 = "";
  let juan = "";
  let ana = "";
  let personaB = "";
  let puestoExtra = "";
  let puestoX1 = "";
  let puestoX2 = "";
  let puestoX3 = "";
  let luis = "";
  let rosa = "";
  const userSup = randomUUID();
  const medidor = { registrar: async () => undefined };
  const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const anio = Number(manana.slice(0, 4));
  const mes = Number(manana.slice(5, 7));

  const ctxOwner = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["pauta"],
      medidor,
    });
  const ctxSup = (alcance: { instalaciones: readonly string[] } | null) =>
    mod.crearContexto({
      tenantId: tenantA,
      actor: { tipo: "user", id: userSup },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "supervisor",
      alcance,
      modulosActivos: ["pauta"],
      medidor,
    });
  const ejecutar = (ctx: ReturnType<typeof ctxOwner>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(ctx, id, input, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } })).id;
    tenantA = await tenant("pauta-a");
    tenantB = await tenant("pauta-b");
    const base = async (tenantId: string, sufijo: string) => {
      const cuenta = (await e.admin.cuenta.create({ data: { tenantId, nombre: `Cuenta ${sufijo}` } })).id;
      const inst = (await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta, nombre: `Planta ${sufijo}` } })).id;
      const cargo = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
      const patron = (await e.admin.patronTurno.create({ data: { tenantId, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 } })).id;
      return { cuenta, inst, cargo, patron };
    };
    const a = await base(tenantA, "A");
    const b = await base(tenantB, "B");
    instA = a.inst;
    instB = b.inst;
    patron4x4 = a.patron;
    patron5x2 = (await e.admin.patronTurno.create({ data: { tenantId: tenantA, nombre: "5x2", clase: "semanal", diasTrabajo: 5, diasDescanso: 2, diasSemana: [1, 2, 3, 4, 5] } })).id;
    instA2 = (await e.admin.instalacion.create({ data: { tenantId: tenantA, cuentaId: a.cuenta, nombre: "Bodega A2" } })).id;
    const puesto = async (tenantId: string, instalacionId: string, cargoId: string, nombre: string, hi: string, hf: string) =>
      (await e.admin.puesto.create({ data: { tenantId, instalacionId, cargoId, nombre, diasTrabajo: 4, diasDescanso: 4, horaInicio: hi, horaFin: hf } })).id;
    puestoDia = await puesto(tenantA, instA, a.cargo, "Portería · Día", "08:00", "20:00");
    puestoNoche = await puesto(tenantA, instA, a.cargo, "Portería · Noche", "20:00", "08:00");
    puestoOtraInst = await puesto(tenantA, instA2, a.cargo, "Acceso · Día", "08:00", "20:00");
    puestoB = await puesto(tenantB, instB, b.cargo, "Puesto B", "08:00", "20:00");
    puestoExtra = await puesto(tenantA, instA, a.cargo, "Extra · Día", "08:00", "20:00");
    puestoX1 = await puesto(tenantA, instA, a.cargo, "X1 · Día", "08:00", "20:00");
    puestoX2 = await puesto(tenantA, instA, a.cargo, "X2 · Día", "08:00", "20:00");
    puestoX3 = await puesto(tenantA, instA, a.cargo, "X3 · Día", "08:00", "20:00");
    const persona = async (tenantId: string, cargoId: string, instalacionId: string, nombres: string, rut: string) => {
      const id = (await e.admin.persona.create({ data: { tenantId, nombres, apellidos: "Prueba", rut, estado: "activa" } })).id;
      await e.admin.vinculoLaboral.create({ data: { tenantId, personaId: id, cargoId, instalacionId, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" } });
      return id;
    };
    juan = await persona(tenantA, a.cargo, instA, "Juan", "11.111.111-1");
    ana = await persona(tenantA, a.cargo, instA, "Ana", "12.121.212-1");
    personaB = await persona(tenantB, b.cargo, instB, "Persona", "22.222.222-2");
    luis = await persona(tenantA, a.cargo, instA, "Luis", "13.131.313-1");
    rosa = await persona(tenantA, a.cargo, instA, "Rosa", "14.141.414-1");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const fijar = (puestoId: string, extra: Record<string, unknown> = {}, o = {}) =>
    ejecutar(ctxOwner(tenantA), "pauta.series.fijar", { puestoId, patronId: patron4x4, inicioCiclo: manana, titularPersonaId: juan, desde: manana, ...extra }, o);

  it("la vista previa no escribe y la serie real se lee en el mes", async () => {
    const previa = await fijar(puestoDia, {}, { dryRun: true });
    expect(previa, JSON.stringify(previa)).toMatchObject({ ok: true });
    expect(await e.admin.seriePauta.count({ where: { puestoId: puestoDia } })).toBe(0);
    const real = await fijar(puestoDia);
    expect(real.ok).toBe(true);
    const mesR = await ejecutar(ctxOwner(tenantA), "pauta.mes.leer", { instalacionId: instA, anio, mes });
    expect(mesR.ok).toBe(true);
    const p = (mesR as { data: { puestos: { id: string; serie: { titular: string } | null; resumen: { cubiertos: number } }[] } }).data.puestos.find((x) => x.id === puestoDia);
    expect(p?.serie?.titular).toBe("Juan Prueba");
    expect(p?.resumen.cubiertos).toBeGreaterThan(0);
  });

  it("prohibido doblar: Juan ya cubre el día de esa instalación; la noche del mismo ciclo se rechaza", async () => {
    const r = await fijar(puestoNoche);
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(JSON.stringify(r)).toContain("doblar");
  });

  it("un ciclo desplazado 4 días tampoco sirve: la noche toca el turno diurno siguiente", async () => {
    const cuatro = new Date(new Date(`${manana}T00:00:00Z`).getTime() + 4 * 86_400_000).toISOString().slice(0, 10);
    const r = await fijar(puestoNoche, { inicioCiclo: cuatro });
    expect(r).toMatchObject({ ok: false }); // la noche del día 4 toca el turno diurno siguiente (24 h seguidas)
  });

  it("otra persona sí cubre la noche; un titular de otro tenant no existe", async () => {
    expect((await fijar(puestoNoche, { titularPersonaId: ana })).ok).toBe(true);
    const ajeno = await fijar(puestoNoche, { titularPersonaId: personaB });
    expect(ajeno).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("no modifica días pasados: con serie previa, una fecha anterior a hoy se rechaza", async () => {
    const r = await fijar(puestoDia, { desde: "2020-01-01" });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  const sumar = (n: number) => new Date(new Date(`${manana}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

  it("no doblar mira también el turno de noche que empezó el día anterior a la serie nueva", async () => {
    // Ana cubre la noche m..m+3 (20:00–08:00): el turno de m+3 termina a las 08:00 de m+4. Un turno
    // diurno que parte en m+4 lo toca, aunque «desde» sea m+4 y el cruce nazca el día anterior.
    const r = await fijar(puestoExtra, { titularPersonaId: ana, inicioCiclo: sumar(4), desde: sumar(4) });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("dos cambios simultáneos con el mismo titular no lo doblan: uno pasa y el otro se rechaza", async () => {
    const [a, b] = await Promise.all([fijar(puestoX1, { titularPersonaId: luis }), fijar(puestoX2, { titularPersonaId: luis })]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
  });

  it("el mensaje de «no doblar» no nombra un puesto fuera del alcance del supervisor", async () => {
    // Rosa figura como titular de un puesto de otra instalación (dato heredado, sembrado como propietario).
    const ajena = await e.admin.seriePauta.create({
      data: { tenantId: tenantA, puestoId: puestoOtraInst, patronId: patron4x4, inicioCiclo: new Date(`${manana}T00:00:00Z`), titularPersonaId: rosa, vigenteDesde: new Date(`${manana}T00:00:00Z`) },
    });
    const r = await ejecutar(ctxSup({ instalaciones: [instA] }), "pauta.series.fijar", { puestoId: puestoX3, patronId: patron4x4, inicioCiclo: manana, titularPersonaId: rosa, desde: manana });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(JSON.stringify(r)).not.toContain("Acceso");
    await e.admin.seriePauta.delete({ where: { id: ajena.id } });
  });

  it("rechaza fechas inexistentes y rangos desmesurados antes de expandirlos", async () => {
    expect(await fijar(puestoX3, { inicioCiclo: "2026-02-30" })).toMatchObject({ ok: false });
    const r = await ejecutar(ctxOwner(tenantA), "pauta.excepciones.crear", { puestoId: puestoNoche, tipo: "permiso", motivo: "Permiso", desde: manana, hasta: "9999-12-31" });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("cambiar la serie cierra la anterior el día antes y deja una sola abierta", async () => {
    const dentro = new Date(new Date(`${manana}T00:00:00Z`).getTime() + 10 * 86_400_000).toISOString().slice(0, 10);
    const r = await fijar(puestoDia, { patronId: patron5x2, desde: dentro, titularPersonaId: juan });
    expect(r.ok).toBe(true);
    const series = await e.admin.seriePauta.findMany({ where: { puestoId: puestoDia }, orderBy: { vigenteDesde: "asc" } });
    expect(series).toHaveLength(2);
    expect(series[0]!.vigenteHasta?.toISOString().slice(0, 10)).toBe(new Date(new Date(`${dentro}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10));
    expect(series[1]!.vigenteHasta).toBeNull();
    expect(await e.admin.historialPauta.count({ where: { puestoId: puestoDia, accion: "serie_fijada" } })).toBe(2);
  });

  it("excepción: crea PPC con motivo, rechaza repetir el día y se anula", async () => {
    const crear = (extra: Record<string, unknown> = {}) =>
      ejecutar(ctxOwner(tenantA), "pauta.excepciones.crear", { puestoId: puestoNoche, tipo: "licencia", motivo: "Licencia médica", desde: manana, hasta: manana, ...extra });
    expect((await crear()).ok).toBe(true);
    expect(await crear()).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const ppc = await ejecutar(ctxOwner(tenantA), "pauta.ppc.listar", { anio, mes, instalacionId: instA });
    expect((ppc as { data: { motivo: string }[] }).data.some((x) => x.motivo === "licencia")).toBe(true);
    const anular = await ejecutar(ctxOwner(tenantA), "pauta.excepciones.anular", { puestoId: puestoNoche, desde: manana, hasta: manana });
    expect(anular).toMatchObject({ ok: true, data: { anuladas: 1 } });
    expect((await crear()).ok).toBe(true); // anulada la anterior, el día queda libre para otra
  });

  it("una excepción solo cuenta los días de turno del rango; un rango solo de días libres se rechaza", async () => {
    const crear = (desde: string, hasta: string) =>
      ejecutar(ctxOwner(tenantA), "pauta.excepciones.crear", { puestoId: puestoNoche, tipo: "vacaciones", motivo: "Vacaciones de prueba", desde, hasta });
    // 4×4 desde `manana`: turno los días 0–3 y 8–11, libre 4–7 y 12–15.
    expect(await crear(sumar(4), sumar(7))).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await crear(sumar(6), sumar(13))).toMatchObject({ ok: true, data: { dias: 4 } });
  });

  it("el historial lista los cambios y es append-only para la app", async () => {
    const h = await ejecutar(ctxOwner(tenantA), "pauta.historial.listar", { instalacionId: instA });
    expect(h.ok && (h.data as { items: unknown[] }).items.length).toBeGreaterThan(2);
    await expect(
      e.forTenant(tenantA).historialPauta.updateMany({ data: { accion: "serie_fijada" } }),
    ).rejects.toThrow();
  });

  it("aislamiento: A no ve ni toca la pauta de B, ni siquiera con el id directo", async () => {
    const leer = await ejecutar(ctxOwner(tenantA), "pauta.mes.leer", { instalacionId: instB, anio, mes });
    expect(leer).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const fijarB = await ejecutar(ctxOwner(tenantA), "pauta.series.fijar", { puestoId: puestoB, patronId: patron4x4, inicioCiclo: manana, titularPersonaId: null, desde: manana });
    expect(fijarB).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const exc = await ejecutar(ctxOwner(tenantA), "pauta.excepciones.crear", { puestoId: puestoB, tipo: "ausencia", motivo: "Ausencia", desde: manana });
    expect(exc).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await e.forTenant(tenantA).seriePauta.count({ where: { puestoId: puestoB } })).toBe(0);
    expect(await e.forTenant(tenantB).seriePauta.count()).toBe(0);
  });

  it("alcance: el supervisor solo ve y edita sus instalaciones; sin instalaciones no ve nada", async () => {
    const dentro = ctxSup({ instalaciones: [instA] });
    expect((await ejecutar(dentro, "pauta.mes.leer", { instalacionId: instA, anio, mes })).ok).toBe(true);
    expect(await ejecutar(dentro, "pauta.mes.leer", { instalacionId: instA2, anio, mes })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await ejecutar(dentro, "pauta.excepciones.crear", { puestoId: puestoOtraInst, tipo: "permiso", motivo: "Permiso", desde: manana })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const resumen = await ejecutar(dentro, "pauta.resumen.leer", { anio, mes });
    expect((resumen as { data: { instalaciones: { instalacionId: string }[] } }).data.instalaciones.every((i) => i.instalacionId === instA)).toBe(true);
    const sinNada = await ejecutar(ctxSup({ instalaciones: [] }), "pauta.resumen.leer", { anio, mes });
    expect((sinNada as { data: { instalaciones: unknown[] } }).data.instalaciones).toHaveLength(0);
    const hist = await ejecutar(dentro, "pauta.historial.listar", {});
    expect((hist as { data: { items: { instalacionId: string }[] } }).data.items.every((i) => i.instalacionId === instA)).toBe(true);
  });

  it("el viewer lee pero no escribe", async () => {
    const viewer = mod.crearContexto({ tenantId: tenantA, actor: { tipo: "user", id: randomUUID() }, portal: "erp", portalesMembresia: ["erp"], rol: "viewer", modulosActivos: ["pauta"], medidor });
    expect((await ejecutar(viewer, "pauta.mes.leer", { instalacionId: instA, anio, mes })).ok).toBe(true);
    expect(await ejecutar(viewer, "pauta.excepciones.crear", { puestoId: puestoDia, tipo: "ausencia", motivo: "Ausencia", desde: manana })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
