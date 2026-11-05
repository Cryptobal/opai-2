// CAR-89 · A1: marca legal (Postgres real): hora del servidor, snapshot, hash encadenado, inmutabilidad
// para todos los roles, verificación de la cadena, aislamiento entre dos empresas y carga de 500 marcas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/asistencia/manifest";
import { PIN_SIMULADO } from "../../../modules/asistencia/capabilities";
import { trabajoVerificarCadenaMarcas } from "../../../modules/asistencia/capabilities/cadena";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Res = { ok: boolean; data?: any; error?: { code: string; message: string } };

describe.skipIf(!urlPropietario)("Asistencia · marca legal (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const medidor = { registrar: async () => undefined };
  const A = { tenant: "", inst: "", personas: [] as string[] };
  const B = { tenant: "", inst: "", persona: "" };

  const ctx = (tenantId: string, portal = "terreno") =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: randomUUID() }, portal, portalesMembresia: [portal],
      rol: "owner", modulosActivos: ["asistencia"], medidor,
    });
  const ejecutar = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o) as Promise<Res>;
  const marcar = (c: ReturnType<typeof ctx>, personaId: string, instalacionId: string, extra: Record<string, unknown> = {}) =>
    ejecutar(c, "asistencia.marcas.registrar", {
      personaId, instalacionId, metodo: "rut_pin", credencial: PIN_SIMULADO,
      claveDispositivo: randomUUID(), ...extra,
    });

  async function empresa(slug: string, personas: number) {
    const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: `Empresa ${slug}`, vertical: "seguridad" } })).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "Mandante SA", razonSocial: "Mandante SA", rut: "76111111-1" } })).id;
    const inst = (await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId: cuenta, nombre: "Planta Norte", lat: -33.4, lng: -70.6, geocercaM: 100 } })).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    const ids: string[] = [];
    for (let i = 0; i < personas; i++) {
      const p = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: `P${i}`, apellidos: "Prueba", rut: `${10 + i}${slug.length}.000.000-${i % 9}`, estado: "activa" } })).id;
      await e.admin.vinculoLaboral.create({ data: { tenantId: tenant, personaId: p, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
      ids.push(p);
    }
    await e.admin.ajuste.create({ data: { tenantId: tenant, ambito: "tenant", sujetoId: tenant, modulo: "asistencia", clave: "marcas_habilitadas", valor: true } });
    return { tenant, inst, ids };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const a = await empresa("a", 50);
    A.tenant = a.tenant; A.inst = a.inst; A.personas = a.ids;
    const b = await empresa("b", 1);
    B.tenant = b.tenant; B.inst = b.inst; B.persona = b.ids[0]!;
  });
  afterAll(async () => { await e?.cerrar(); });

  it("apagada por defecto: sin el ajuste no sale ninguna marca", async () => {
    await e.admin.ajuste.deleteMany({ where: { tenantId: B.tenant } });
    const r = await marcar(ctx(B.tenant), B.persona, B.inst);
    expect(r.ok).toBe(false);
    await e.admin.ajuste.create({ data: { tenantId: B.tenant, ambito: "tenant", sujetoId: B.tenant, modulo: "asistencia", clave: "marcas_habilitadas", valor: true } });
  });

  it("registra con hora del servidor, snapshot completo y hash encadenado", async () => {
    const p = A.personas[0]!;
    const horaDispositivo = new Date(Date.now() - 4000).toISOString();
    const r1 = await marcar(ctx(A.tenant), p, A.inst, { horaDispositivo, lat: -33.4, lng: -70.6, precisionM: 8 });
    expect(r1.ok, JSON.stringify(r1)).toBe(true);
    expect(r1.data.marca).toMatchObject({ seq: 1, tipo: "entrada", metodo: "rut_pin", gpsEstado: "dentro" });
    expect(r1.data.marca.desfaseS).toBeGreaterThanOrEqual(3);
    const r2 = await marcar(ctx(A.tenant), p, A.inst);
    expect(r2.data.marca).toMatchObject({ seq: 2, tipo: "salida", gpsEstado: "sin_gps" });
    const filas = await e.admin.marca.findMany({ where: { tenantId: A.tenant, personaId: p }, orderBy: { seq: "asc" } });
    expect(filas[1]!.hashAnterior).toBe(filas[0]!.hash);
    expect(filas[0]!.snapshot).toMatchObject({ establecimiento: "Planta Norte", mandanteRut: "76111111-1" });
    // La bitácora recibió el hecho.
    expect(await e.admin.bitacora.count({ where: { tenantId: A.tenant, tipo: "asistencia.marca.registrada" } })).toBe(2);
  });

  it("el GPS nunca bloquea: fuera de rango se registra y queda señalado", async () => {
    const r = await marcar(ctx(A.tenant), A.personas[1]!, A.inst, { lat: -33.5, lng: -70.7 });
    expect(r.ok).toBe(true);
    expect(r.data.marca.gpsEstado).toBe("fuera");
    expect(r.data.marca.distanciaM).toBeGreaterThan(100);
  });

  it("reintentar con la misma clave no duplica (T-06)", async () => {
    const clave = randomUUID();
    const a = await marcar(ctx(A.tenant), A.personas[2]!, A.inst, { claveDispositivo: clave });
    const b = await marcar(ctx(A.tenant), A.personas[2]!, A.inst, { claveDispositivo: clave });
    expect(b.data).toMatchObject({ repetida: true, marca: { id: a.data.marca.id } });
    expect(await e.admin.marca.count({ where: { tenantId: A.tenant, personaId: A.personas[2]! } })).toBe(1);
  });

  it("PIN equivocado, y un agente nunca marca por un trabajador", async () => {
    const mal = await marcar(ctx(A.tenant), A.personas[3]!, A.inst, { credencial: "000000" });
    expect(mal.ok).toBe(false);
    const agente = mod.crearContexto({
      tenantId: A.tenant, actor: { tipo: "agent", id: randomUUID(), viaUserId: randomUUID() }, portal: "terreno",
      portalesMembresia: ["terreno"], rol: "owner", modulosActivos: ["asistencia"], medidor,
    });
    const r = await marcar(agente, A.personas[3]!, A.inst);
    expect(r.ok).toBe(false);
    expect(await e.admin.marca.count({ where: { tenantId: A.tenant, personaId: A.personas[3]! } })).toBe(0);
    const erp = await marcar(ctx(A.tenant, "erp"), A.personas[3]!, A.inst);
    expect(erp.ok).toBe(false);
  });

  it("dos empresas: nadie ve ni verifica las marcas de la otra", async () => {
    const rb = await marcar(ctx(B.tenant), B.persona, B.inst);
    expect(rb.ok).toBe(true);
    const hashA = (await e.admin.marca.findFirstOrThrow({ where: { tenantId: A.tenant } })).hash;
    const lista = await ejecutar(ctx(B.tenant, "erp"), "asistencia.marcas.listar", { instalacionId: A.inst, desde: new Date(Date.now() - 86_400_000).toISOString(), hasta: new Date(Date.now() + 86_400_000).toISOString() });
    expect(lista.ok && lista.data.items).toEqual([]);
    const v = await ejecutar(ctx(B.tenant, "erp"), "asistencia.marcas.verificar", { hash: hashA });
    expect(v.data).toEqual({ valida: false });
    const vA = await ejecutar(ctx(A.tenant, "erp"), "asistencia.marcas.verificar", { hash: hashA });
    expect(vA.data).toMatchObject({ valida: true, integra: true, establecimiento: "Planta Norte" });
    expect(Object.keys(vA.data).sort()).toEqual(["codigo", "empresa", "establecimiento", "horaServidor", "integra", "tipo", "valida"]);
  });

  it("el supervisor ve solo las marcas de sus instalaciones y el trabajador solo las suyas", async () => {
    const otra = (await e.admin.instalacion.create({ data: { tenantId: A.tenant, cuentaId: (await e.admin.cuenta.findFirstOrThrow({ where: { tenantId: A.tenant } })).id, nombre: "Otra" } })).id;
    const sup = (instalaciones: string[]) => mod.crearContexto({
      tenantId: A.tenant, actor: { tipo: "user", id: randomUUID() }, portal: "supervisor", portalesMembresia: ["supervisor"],
      rol: "supervisor", alcance: { instalaciones }, modulosActivos: ["asistencia"], medidor,
    });
    const rango = { desde: new Date(Date.now() - 86_400_000).toISOString(), hasta: new Date(Date.now() + 86_400_000).toISOString() };
    const propias = await ejecutar(sup([A.inst]), "asistencia.marcas.listar", rango);
    expect(propias.ok && propias.data.items.length).toBeGreaterThan(0);
    const ajenas = await ejecutar(sup([otra]), "asistencia.marcas.listar", rango);
    expect(ajenas.ok && ajenas.data.items).toEqual([]);
  });

  it("UPDATE, DELETE y TRUNCATE fallan para el dueño y para la aplicación", async () => {
    const id = (await e.admin.marca.findFirstOrThrow({ where: { tenantId: A.tenant } })).id;
    await expect(e.admin.$executeRawUnsafe(`UPDATE asistencia.marcas SET tipo = 'salida' WHERE id = '${id}'`)).rejects.toThrow(/solo se agregan/);
    await expect(e.admin.$executeRawUnsafe(`DELETE FROM asistencia.marcas WHERE id = '${id}'`)).rejects.toThrow(/solo se agregan/);
    await expect(e.admin.$executeRawUnsafe(`TRUNCATE asistencia.marcas`)).rejects.toThrow(/solo se agregan/);
    await expect(e.appSinTenant.$executeRawUnsafe(`UPDATE asistencia.marcas SET tipo = 'salida' WHERE id = '${id}'`)).rejects.toThrow();
    await expect(e.appSinTenant.$executeRawUnsafe(`DELETE FROM asistencia.marcas WHERE id = '${id}'`)).rejects.toThrow();
    await expect(e.appSinTenant.$executeRawUnsafe(`TRUNCATE asistencia.marcas`)).rejects.toThrow();
  });

  it("la verificación diaria detecta una cadena manipulada y alerta", async () => {
    const t = (await ctxSistema(A.tenant));
    const ok = (await trabajoVerificarCadenaMarcas.ejecutar(t, {})) as { ok: boolean };
    expect(ok.ok).toBe(true);
    // Un dueño con permiso de desactivar triggers altera el registro a mano.
    await e.admin.$executeRawUnsafe(`ALTER TABLE asistencia.marcas DISABLE TRIGGER inmutable`);
    try {
      await e.admin.$executeRawUnsafe(`UPDATE asistencia.marcas SET lat = -10 WHERE tenant_id = '${A.tenant}' AND seq = 2`);
      const roto = (await trabajoVerificarCadenaMarcas.ejecutar(t, {})) as { ok: boolean; primeraRota: number };
      expect(roto).toMatchObject({ ok: false, primeraRota: 2 });
      expect(await e.admin.incidenteTecnico.count({ where: { tenantId: A.tenant, tipo: "cadena_rota" } })).toBe(1);
      expect(await e.admin.evento.count({ where: { tenantId: A.tenant, tipo: "asistencia.cadena.rota" } })).toBe(1);
    } finally {
      await e.admin.$executeRawUnsafe(`UPDATE asistencia.marcas SET lat = NULL WHERE tenant_id = '${A.tenant}' AND seq = 2`);
      await e.admin.$executeRawUnsafe(`ALTER TABLE asistencia.marcas ENABLE TRIGGER inmutable`);
    }
  });

  it("reintento concurrente con la misma clave devuelve la misma marca y no marca por otra persona desde el teléfono", async () => {
    const clave = randomUUID();
    const [x, y] = await Promise.all([
      marcar(ctx(A.tenant), A.personas[10]!, A.inst, { claveDispositivo: clave }),
      marcar(ctx(A.tenant), A.personas[10]!, A.inst, { claveDispositivo: clave }),
    ]);
    expect([x.ok, y.ok]).toEqual([true, true]);
    expect(x.data.marca.id).toBe(y.data.marca.id);
    expect(await e.admin.marca.count({ where: { tenantId: A.tenant, personaId: A.personas[10]! } })).toBe(1);
    const ajeno = await marcar(ctx(A.tenant, "trabajador"), A.personas[11]!, A.inst, { canal: "telefono_personal" });
    expect(ajeno.ok).toBe(false);
  });

  it("500 marcas en 10 minutos sin duplicados ni huecos en la cadena (E-07)", async () => {
    const inicio = Date.now();
    const personas = A.personas.slice(4, 49); // 45 personas × ~11 marcas
    const tareas: (() => Promise<Res>)[] = [];
    for (let ronda = 0; ronda < 12 && tareas.length < 500; ronda++)
      for (const p of personas) if (tareas.length < 500) tareas.push(() => marcar(ctx(A.tenant), p, A.inst));
    const resultados: Res[] = [];
    for (let i = 0; i < tareas.length; i += 20) resultados.push(...(await Promise.all(tareas.slice(i, i + 20).map((t) => t()))));
    expect(resultados.filter((r) => !r.ok).map((r) => r.error?.message)).toEqual([]);
    expect(Date.now() - inicio).toBeLessThan(10 * 60_000);
    const filas = await e.admin.marca.findMany({ where: { tenantId: A.tenant }, orderBy: { seq: "asc" }, select: { seq: true, hash: true, hashAnterior: true } });
    expect(new Set(filas.map((f) => f.hash)).size).toBe(filas.length);
    expect(filas.map((f) => f.seq)).toEqual(filas.map((_, i) => i + 1));
    expect(filas.every((f, i) => i === 0 || f.hashAnterior === filas[i - 1]!.hash)).toBe(true);
    expect(filas.length).toBeGreaterThanOrEqual(500);
  }, 600_000);

  async function ctxSistema(tenantId: string) {
    return mod.crearContexto({ tenantId, actor: { tipo: "system" }, portal: null, modulosActivos: ["asistencia"], medidor });
  }
});
