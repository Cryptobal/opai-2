// CAR-89 · circuito de marca (Postgres real, datos sintéticos de dos empresas «qa-…», sin rostros ni datos de Gard):
// un único registro de marca idempotente → evento → día consolidado, con una noche que cruza la fecha, reintentos y
// permisos. La identificación de hoy es RUT + PIN simulado; el rostro (#360) entra por la MISMA capacidad
// `asistencia.marcas.registrar`, así que estos casos le aplican sin cambios. La presencia en Pauta (#360) tiene su
// manifiesto en docs/2.0/checklists/asistencia-circuito-casos.md.
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PIN_SIMULADO } from "../../../modules/asistencia/capabilities";
import { manifest } from "../../../modules/asistencia/manifest";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Marca = { id: string; tipo: string };
type Res = { ok: boolean; data: { marca: Marca; repetida: boolean; items: { personaId: string }[] }; error?: { code: string; message: string } };
type Rol = "owner" | "admin" | "gerente" | "supervisor" | "viewer";
const RUT = "11.111.111-1";

describe.skipIf(!urlPropietario)("Asistencia · circuito de marca idempotente (Postgres real, dos empresas)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  type E = { tenant: string; inst: string; persona: string };
  let A: E;
  let B: E;
  // Noche sintética fija (Chile en verano, UTC-3): turno del 3-nov 22:00 al 4-nov 06:00. La hora del servidor se simula
  // (solo `Date`) para que la entrada caiga el 3 y la salida el 4, sin depender de la hora en que corra la prueba.
  const FECHA_TURNO = "2026-11-03";
  const FECHA_SALIDA = "2026-11-04";
  const INICIO = new Date("2026-11-04T01:00:00Z");
  const FIN = new Date("2026-11-04T09:00:00Z");
  const a = (iso: string) => vi.useFakeTimers({ toFake: ["Date"], now: new Date(iso) });
  afterEach(() => vi.useRealTimers());

  const ctx = (tenantId: string, portal = "erp", rol: Rol = "owner") => {
    const id = randomUUID();
    return mod.crearContexto({ tenantId, actor: { tipo: "user", id }, usuario: { id, nombre: "Rrhh", email: "rrhh@empresa.cl", platformRole: null }, portal, portalesMembresia: [portal], rol, modulosActivos: ["asistencia"], medidor });
  };
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) => mod.executeCapability(c, id, input) as Promise<Res>;
  const marcar = (t: E, clave: string, extra: Record<string, unknown> = {}) =>
    run(ctx(t.tenant, "terreno"), "asistencia.marcas.registrar", { personaId: t.persona, instalacionId: t.inst, metodo: "rut_pin", credencial: PIN_SIMULADO, claveDispositivo: clave, ...extra });
  const recalcular = (t: E) => run(ctx(t.tenant), "asistencia.dias.recalcular", { personaId: t.persona, desde: FECHA_TURNO, hasta: FECHA_SALIDA });

  async function empresa(slug: string): Promise<E> {
    const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: `Empresa ${slug}`, vertical: "seguridad" } })).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "Mandante SA", razonSocial: "Mandante SA", rut: "76111111-1" } })).id;
    const inst = (await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId: cuenta, nombre: "Planta Norte" } })).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    const persona = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Noa", apellidos: "Noche", rut: RUT, estado: "activa" } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: tenant, personaId: persona, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    await e.admin.ajuste.create({ data: { tenantId: tenant, ambito: "tenant", sujetoId: tenant, modulo: "asistencia", clave: "marcas_habilitadas", valor: true } });
    await e.admin.turnoEsperado.create({ data: { tenantId: tenant, personaId: persona, fecha: new Date(`${FECHA_TURNO}T00:00:00Z`), inicio: INICIO, fin: FIN, instalacionId: inst, origen: "pauta", colacionMin: 0 } });
    return { tenant, inst, persona };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro(); mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    A = await empresa("a");
    B = await empresa("b");
  });
  afterAll(async () => { await e?.cerrar(); });

  const marcasDe = (t: E) => e.admin.marca.findMany({ where: { tenantId: t.tenant, personaId: t.persona }, orderBy: { horaServidor: "asc" } });
  const eventosDe = (t: E) => e.admin.evento.count({ where: { tenantId: t.tenant, tipo: "asistencia.marca.registrada" } });

  it("noche que cruza la fecha: la entrada y la salida de la madrugada caen en el día del turno", async () => {
    a("2026-11-04T01:05:00Z"); // 22:05 del 3-nov
    const entrada = await marcar(A, randomUUID());
    expect(entrada.ok, JSON.stringify(entrada)).toBe(true);
    expect(entrada.data.marca.tipo).toBe("entrada");
    a("2026-11-04T09:02:00Z"); // 06:02 del 4-nov
    const salida = await marcar(A, randomUUID());
    expect(salida.ok, JSON.stringify(salida)).toBe(true);
    expect(salida.data.marca.tipo).toBe("salida");
    expect((await recalcular(A)).ok).toBe(true);
    const dias = await e.admin.dia.findMany({ where: { tenantId: A.tenant, personaId: A.persona }, orderBy: { fecha: "asc" } });
    // El día del turno lleva la entrada del 3 y la salida de la madrugada del 4 (22:05 → 06:02 = 477 min, 5 min de atraso);
    // el 4 queda «sin turno» y SIN marcas: la salida no se cuenta dos veces.
    expect(dias.map((d) => [d.fecha.toISOString().slice(0, 10), d.estado])).toEqual([[FECHA_TURNO, "presente"], [FECHA_SALIDA, "sin_turno"]]);
    expect(dias[0]).toMatchObject({ minutosTrabajados: 477, segundosAtraso: 300 });
    expect(dias[1]).toMatchObject({ entrada: null, salida: null, minutosTrabajados: 0 });
  });

  it("reintento con la misma clave: misma marca, sin segunda fila, sin segundo evento ni segundo día", async () => {
    const antesMarcas = (await marcasDe(A)).length;
    const antesEventos = await eventosDe(A);
    a("2026-11-05T01:05:00Z");
    const clave = randomUUID();
    const uno = await marcar(A, clave);
    const dos = await marcar(A, clave);
    expect(uno.ok && dos.ok).toBe(true);
    expect(dos.data.repetida).toBe(true);
    expect(dos.data.marca.id).toBe(uno.data.marca.id);
    expect(await marcasDe(A)).toHaveLength(antesMarcas + 1);
    expect(await eventosDe(A)).toBe(antesEventos + 1);
    await recalcular(A);
    await recalcular(A);
    expect(await e.admin.dia.count({ where: { tenantId: A.tenant, personaId: A.persona, fecha: new Date(`${FECHA_TURNO}T00:00:00Z`) } })).toBe(1);
  });

  it("doble toque en paralelo con la misma clave: una sola marca", async () => {
    a("2026-11-04T01:05:00Z");
    const antes = (await marcasDe(B)).length;
    const clave = randomUUID();
    const rs = await Promise.all([marcar(B, clave), marcar(B, clave), marcar(B, clave)]);
    expect(rs.every((r) => r.ok), JSON.stringify(rs)).toBe(true);
    expect(new Set(rs.map((r) => r.data.marca.id)).size).toBe(1);
    expect(await marcasDe(B)).toHaveLength(antes + 1);
  });

  it("dos empresas: cada una ve solo sus marcas y días; la persona de una no se marca desde la otra", async () => {
    await recalcular(B);
    const verA = await run(ctx(A.tenant), "asistencia.dias.listar", { desde: FECHA_TURNO, hasta: FECHA_SALIDA });
    const verB = await run(ctx(B.tenant), "asistencia.dias.listar", { desde: FECHA_TURNO, hasta: FECHA_SALIDA });
    expect(verA.ok && verB.ok).toBe(true);
    expect(verA.data.items.every((d: { personaId: string }) => d.personaId === A.persona)).toBe(true);
    expect(verB.data.items.every((d: { personaId: string }) => d.personaId === B.persona)).toBe(true);
    const cruzada = await run(ctx(B.tenant, "terreno"), "asistencia.marcas.registrar", { personaId: A.persona, instalacionId: A.inst, metodo: "rut_pin", credencial: PIN_SIMULADO, claveDispositivo: randomUUID() });
    expect(cruzada).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await e.admin.marca.count({ where: { tenantId: B.tenant, personaId: A.persona } })).toBe(0);
  });

  it("permisos: un agente nunca marca, el trabajador sin persona propia no lee días ajenos y recalcular exige configurar", async () => {
    const agente = mod.crearContexto({ tenantId: A.tenant, actor: { tipo: "agent", id: randomUUID() } as never, portal: "terreno", modulosActivos: ["asistencia"], medidor });
    const porAgente = await run(agente, "asistencia.marcas.registrar", { personaId: A.persona, instalacionId: A.inst, metodo: "rut_pin", credencial: PIN_SIMULADO, claveDispositivo: randomUUID() });
    expect(porAgente).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const sinPermiso = await run(ctx(A.tenant, "erp", "viewer"), "asistencia.dias.recalcular", { personaId: A.persona, desde: FECHA_TURNO, hasta: FECHA_SALIDA });
    expect(sinPermiso).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const ajeno = await run(ctx(A.tenant, "trabajador", "viewer"), "asistencia.dias.listar", { desde: FECHA_TURNO, hasta: FECHA_SALIDA, personaId: A.persona });
    expect(ajeno.ok ? ajeno.data.items : []).toHaveLength(0);
  });
});
