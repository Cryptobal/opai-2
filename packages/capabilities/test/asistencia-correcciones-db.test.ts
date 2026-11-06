// CAR-89 · A2 (Postgres real): correcciones (propuesta, enlace, aceptar/objetar, vencimiento), contingencia con doble control,
// alertas del art. 45 con reloj simulado e idempotentes, correo personal único y aislamiento entre dos empresas.
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/asistencia/manifest";
import { PIN_SIMULADO } from "../../../modules/asistencia/capabilities";
import { trabajoAlertasArt45 } from "../../../modules/asistencia/capabilities/alertas-art45";
import { trabajoVencerCorrecciones } from "../../../modules/asistencia/capabilities/correcciones-trabajo";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Dato = {
  marca: { id: string }; correccionId: string; id: string; fin: string | null; estado: string; motivo: string;
  items: unknown[];
};
type Res = { ok: boolean; data: Dato; error?: { code: string; message: string } };
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const RUT = "11.111.111-1";

describe.skipIf(!urlPropietario)("Asistencia · correcciones, contingencia y alertas (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const T = { a: "", b: "", inst: "", persona: "", userPersona: randomUUID() };

  const ctx = (tenantId: string, portal = "erp", id: string = randomUUID()) =>
    mod.crearContexto({ tenantId, actor: { tipo: "user", id }, usuario: { id, nombre: "Rrhh", email: "rrhh@empresa.cl", platformRole: null }, portal, portalesMembresia: [portal], rol: "owner", modulosActivos: ["asistencia"], medidor });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) => mod.executeCapability(c, id, input, o) as Promise<Res>;
  const sistema = (tenantId: string) => mod.crearContexto({ tenantId, actor: { tipo: "system" }, portal: null, modulosActivos: ["asistencia"], medidor });

  async function empresa(slug: string) {
    const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: `Empresa ${slug}`, vertical: "seguridad" } })).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "Mandante SA", razonSocial: "Mandante SA", rut: "76111111-1" } })).id;
    const inst = (await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId: cuenta, nombre: "Planta Norte" } })).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    const persona = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Pía", apellidos: "Prueba", rut: RUT, estado: "activa" } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: tenant, personaId: persona, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    await e.admin.ajuste.create({ data: { tenantId: tenant, ambito: "tenant", sujetoId: tenant, modulo: "asistencia", clave: "marcas_habilitadas", valor: true } });
    return { tenant, inst, persona };
  }
  const marcar = (tenant: string, persona: string, inst: string) =>
    run(ctx(tenant, "terreno"), "asistencia.marcas.registrar", { personaId: persona, instalacionId: inst, metodo: "rut_pin", credencial: PIN_SIMULADO, claveDispositivo: randomUUID() });
  const enlace = async (tenant: string, correccionId: string, token: string) =>
    e.admin.correccionEnlace.create({ data: { tenantId: tenant, correccionId, tokenHash: sha(token), venceEn: new Date(Date.now() + 86_400_000) } });

  const evidencia = async (tenant: string) =>
    (await e.admin.documento.create({ data: { tenantId: tenant, nombre: "evidencia.pdf", mime: "application/pdf", tamano: 10, storageKey: `qa/${randomUUID()}`, creadoPorTipo: "user" } })).id;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro(); mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const a = await empresa("a"); T.a = a.tenant; T.inst = a.inst; T.persona = a.persona;
    T.b = (await empresa("b")).tenant;
  });
  afterAll(async () => { await e?.cerrar(); });

  let correccionId = "";
  let marcaId = "";
  const TOKEN = randomUUID().replace(/-/g, "");

  it("RR. HH. propone una corrección con motivo; no borra la marca y una segunda pendiente es conflicto", async () => {
    const m = await marcar(T.a, T.persona, T.inst);
    marcaId = m.data.marca.id;
    const hora = new Date(Date.now() - 3_600_000).toISOString();
    const r = await run(ctx(T.a), "asistencia.correcciones.proponer", { marcaId, horaPropuesta: hora, tipoPropuesto: "entrada", motivo: "El reloj del equipo estaba atrasado", evidenciaDocumentoId: await evidencia(T.a) });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    correccionId = r.data.correccionId;
    expect(await e.admin.marca.count({ where: { id: marcaId } })).toBe(1);
    const otra = await run(ctx(T.a), "asistencia.correcciones.proponer", { marcaId, horaPropuesta: hora, tipoPropuesto: "entrada", motivo: "Otra propuesta distinta", evidenciaDocumentoId: await evidencia(T.a) });
    expect(otra.ok).toBe(false);
    expect(otra.error?.code).toBe("CONFLICT");
    const sinMotivo = await run(ctx(T.a), "asistencia.correcciones.proponer", { marcaId, horaPropuesta: hora, tipoPropuesto: "entrada", motivo: "no", evidenciaDocumentoId: await evidencia(T.a) });
    expect(sinMotivo.ok).toBe(false);
  });

  it("el enlace muestra la corrección; un RUT ajeno o un enlace falso responden igual que «no existe»", async () => {
    await enlace(T.a, correccionId, TOKEN);
    const sys = sistema(T.a);
    const ver = await run(sys, "asistencia.correcciones.ver_enlace", { token: TOKEN });
    expect(ver.data).toMatchObject({ estado: "pendiente", motivo: "El reloj del equipo estaba atrasado" });
    const falso = await run(sys, "asistencia.correcciones.ver_enlace", { token: "x".repeat(32) });
    expect(falso.error?.code).toBe("NOT_FOUND");
    const rutMal = await run(sys, "asistencia.correcciones.responder_enlace", { token: TOKEN, rut: "22.222.222-2", resultado: "aceptada" });
    expect(rutMal.error?.code).toBe("NOT_FOUND");
    const deB = await run(sistema(T.b), "asistencia.correcciones.ver_enlace", { token: TOKEN });
    expect(deB.error?.code).toBe("NOT_FOUND");
  });

  it("objetar exige comentario; responder es único y deja respuesta inmutable", async () => {
    const sys = sistema(T.a);
    const sin = await run(sys, "asistencia.correcciones.responder_enlace", { token: TOKEN, rut: RUT, resultado: "objetada" });
    expect(sin.ok).toBe(false);
    const ok = await run(sys, "asistencia.correcciones.responder_enlace", { token: TOKEN, rut: RUT, resultado: "objetada", comentario: "Yo marqué a la hora correcta" });
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    const doble = await run(sys, "asistencia.correcciones.responder_enlace", { token: TOKEN, rut: RUT, resultado: "aceptada" });
    expect(doble.error?.code).toBe("CONFLICT");
    const ver = await run(sys, "asistencia.correcciones.ver_enlace", { token: TOKEN });
    expect(ver.data.estado).toBe("objetada");
    await expect(e.admin.$executeRawUnsafe(`UPDATE asistencia.correcciones_respuestas SET resultado = 'aceptada' WHERE tenant_id = '${T.a}'`)).rejects.toThrow();
  });

  it("sin respuesta en el plazo la corrección vence (una sola vez, con reloj simulado)", async () => {
    const m2 = await marcar(T.a, T.persona, T.inst);
    const r = await run(ctx(T.a), "asistencia.correcciones.proponer", { marcaId: m2.data.marca.id, horaPropuesta: new Date(Date.now() - 7_200_000).toISOString(), tipoPropuesto: "salida", motivo: "Se olvidó marcar la salida a tiempo", evidenciaDocumentoId: await evidencia(T.a) });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const antes = (await trabajoVencerCorrecciones.ejecutar(sistema(T.a), {})) as { vencidas: number };
    expect(antes.vencidas).toBe(0);
    const futuro = new Date(Date.now() + 49 * 3_600_000).toISOString();
    const v1 = (await trabajoVencerCorrecciones.ejecutar(sistema(T.a), { ahora: futuro })) as { vencidas: number };
    const v2 = (await trabajoVencerCorrecciones.ejecutar(sistema(T.a), { ahora: futuro })) as { vencidas: number };
    expect(v1.vencidas).toBe(1);
    expect(v2.vencidas).toBe(0);
    expect(await e.admin.correccionRespuesta.count({ where: { tenantId: T.a, resultado: "vencida" } })).toBe(1);
  });

  it("la corrección sin evidencia se rechaza", async () => {
    const m = await marcar(T.a, T.persona, T.inst);
    const r = await run(ctx(T.a), "asistencia.correcciones.proponer", { marcaId: m.data.marca.id, horaPropuesta: new Date().toISOString(), tipoPropuesto: "salida", motivo: "Sin evidencia adjunta" });
    expect(r.ok).toBe(false);
  });

  it("contingencia: RR. HH. propone con evidencia; solo el trabajador la acepta y recién ahí cuenta", async () => {
    const autor = randomUUID();
    const base = { personaId: T.persona, instalacionId: T.inst, tipo: "salida", horaDeclarada: new Date(Date.now() - 600_000).toISOString(), motivo: "Caída del sistema durante el turno" };
    const sin = await run(ctx(T.a, "erp", autor), "asistencia.contingencias.registrar", base);
    expect(sin.ok).toBe(false);
    const reg = await run(ctx(T.a, "erp", autor), "asistencia.contingencias.registrar", { ...base, evidenciaDocumentoId: await evidencia(T.a) });
    expect(reg.ok, JSON.stringify(reg)).toBe(true);
    expect(await e.admin.marca.count({ where: { tenantId: T.a, origen: "contingencia" } })).toBe(0);
    // RR. HH. ya no resuelve: la capacidad no existe para ellos.
    const rrhh = await run(ctx(T.a), "asistencia.contingencias.responder", { contingenciaId: reg.data.id, decision: "aceptada" });
    expect(rrhh.ok).toBe(false);
    const u = await e.admin.user.create({ data: { name: "Pía", email: `pia-${randomUUID().slice(0, 8)}@prueba.cl` } });
    await e.admin.membership.create({ data: { tenantId: T.a, userId: u.id, rol: "viewer", portales: ["trabajador"], estado: "activa" } });
    await e.admin.persona.update({ where: { id: T.persona }, data: { usuarioId: u.id } });
    const trabajador = ctx(T.a, "trabajador", u.id);
    const sinComentario = await run(trabajador, "asistencia.contingencias.responder", { contingenciaId: reg.data.id, decision: "rechazada" });
    expect(sinComentario.ok).toBe(false);
    const ok = await run(trabajador, "asistencia.contingencias.responder", { contingenciaId: reg.data.id, decision: "aceptada" });
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    expect(await e.admin.marca.count({ where: { tenantId: T.a, origen: "contingencia" } })).toBe(1);
    const dos = await run(trabajador, "asistencia.contingencias.responder", { contingenciaId: reg.data.id, decision: "rechazada", comentario: "Ya no" });
    expect(dos.ok).toBe(false);
  });

  it("incidente técnico: se registra, se cierra y no se ve desde otra empresa", async () => {
    const i = await run(ctx(T.a), "asistencia.incidentes.registrar", { tipo: "otro", severidad: "media", inicio: new Date().toISOString() });
    expect(i.ok, JSON.stringify(i)).toBe(true);
    const c = await run(ctx(T.a), "asistencia.incidentes.cerrar", { incidenteId: i.data.id });
    expect(c.data.fin).toBeTruthy();
    const deB = await run(ctx(T.b), "asistencia.incidentes.listar", {});
    expect(deB.data.items).toEqual([]);
  });

  it("alerta de falta de marca de inicio a los 30 min: una vez por turno aunque el trabajo corra dos veces", async () => {
    const inicio = new Date("2026-12-01T12:00:00Z");
    await e.admin.turnoEsperado.create({ data: { tenantId: T.a, personaId: T.persona, fecha: new Date("2026-12-01"), inicio, fin: new Date("2026-12-01T20:00:00Z"), instalacionId: T.inst, origen: "pauta" } });
    const temprano = (await trabajoAlertasArt45.ejecutar(sistema(T.a), { ahora: "2026-12-01T12:20:00Z" })) as { inicio: number };
    expect(temprano.inicio).toBe(0);
    const t1 = (await trabajoAlertasArt45.ejecutar(sistema(T.a), { ahora: "2026-12-01T12:31:00Z" })) as { inicio: number };
    const t2 = (await trabajoAlertasArt45.ejecutar(sistema(T.a), { ahora: "2026-12-01T12:45:00Z" })) as { inicio: number };
    expect(t1.inicio).toBe(1);
    expect(t2.inicio).toBe(0);
    expect(await e.admin.alerta.count({ where: { tenantId: T.a, tipo: "sin_marca_inicio" } })).toBe(1);
    expect(await e.admin.alerta.count({ where: { tenantId: T.b } })).toBe(0);
  });

  it("el correo personal es único por empresa (no retroactivo) y distinto entre empresas", async () => {
    const otra = (await e.admin.persona.create({ data: { tenantId: T.a, nombres: "Otro", apellidos: "Trabajador", rut: "12.222.222-2", estado: "activa" } })).id;
    await e.admin.persona.update({ where: { id: T.persona }, data: { emailPersonal: "pia@correo.cl" } });
    await expect(e.admin.persona.update({ where: { id: otra }, data: { emailPersonal: "PIA@correo.cl" } })).rejects.toThrow(/correo personal/i);
    const deB = await e.admin.persona.create({ data: { tenantId: T.b, nombres: "En B", apellidos: "Otra", rut: "13.333.333-3", estado: "activa", emailPersonal: "pia@correo.cl" } });
    expect(deB.id).toBeTruthy();
  });
});
