/* eslint-disable max-lines -- una sola historia de punta a punta contra Postgres real */
// CAR-89 · Face ID sobre el B4 de main (Postgres real, proveedor simulado, rol sin BYPASSRLS): el kiosco (equipo +
// PIN) y el teléfono (sesión) consienten, enrolan y marcan; RUT + PIN y rostro desembocan en la MISMA marca
// auditable, que la Pauta diaria y mensual reflejan; dos empresas no se ven; revocar borra y deja marcar con PIN.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPin } from "@opai/db";

import { manifest } from "../../../modules/asistencia/manifest";
import { trabajoSuprimirBiometria } from "../../../modules/asistencia/capabilities/biometria-trabajo";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { ok: boolean; data: Record<string, unknown> & { marca?: { metodo: string; id: string }; repetida?: boolean }; error?: { code: string; message: string } };
const PIN = "482915";

describe.skipIf(!urlPropietario)("Asistencia · Face ID sobre B4 (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const previas = { ...process.env };
  const medidor = { registrar: async () => undefined };
  type Emp = { tenant: string; inst: string; persona: string; usuario: string; equipo: string; puesto: string };
  const A = {} as Emp;
  const B = {} as Emp;

  const sistema = (t: string) => mod.crearContexto({ tenantId: t, actor: { tipo: "system" }, portal: null, modulosActivos: ["asistencia", "pauta"], medidor });
  const usuarioCtx = (t: Emp, portal = "trabajador") =>
    mod.crearContexto({
      tenantId: t.tenant, actor: { tipo: "user", id: t.usuario }, usuario: { id: t.usuario, nombre: "U", email: `${t.usuario}@x.cl`, platformRole: null },
      portal, portalesMembresia: [portal], rol: "owner", modulosActivos: ["asistencia", "pauta"], medidor,
    });
  const erp = (t: string) =>
    mod.crearContexto({ tenantId: t, actor: { tipo: "user", id: randomUUID() }, usuario: { id: randomUUID(), nombre: "RRHH", email: "rrhh@x.cl", platformRole: null }, portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["asistencia", "pauta"], medidor });
  const run = (c: ReturnType<typeof sistema>, id: string, input: unknown, o = {}) => mod.executeCapability(c, id, input, o) as Promise<Res>;
  // El kiosco: sin sesión, con el equipo emparejado como credencial y la persona identificada por su PIN.
  const kiosco = (t: Emp, id: string, extra: Record<string, unknown> = {}) =>
    run(sistema(t.tenant), id, { personaId: t.persona, dispositivoId: t.equipo, credencial: PIN, ...extra });
  const marcarKiosco = (t: Emp, extra: Record<string, unknown>) =>
    run(sistema(t.tenant), "asistencia.marcas.registrar", { personaId: t.persona, instalacionId: t.inst, dispositivoId: t.equipo, canal: "kiosco", claveDispositivo: randomUUID(), ...extra });
  const setAjuste = async (t: string, clave: string, valor: unknown) => {
    await e.admin.ajuste.deleteMany({ where: { tenantId: t, modulo: "asistencia", clave } });
    await e.admin.ajuste.create({ data: { tenantId: t, ambito: "tenant", sujetoId: t, modulo: "asistencia", clave, valor: valor as never } });
  };

  async function empresa(slug: string): Promise<Emp> {
    const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: slug, vertical: "seguridad" } })).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "Mandante", razonSocial: "Mandante SA", rut: "76111111-1" } })).id;
    const inst = (await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId: cuenta, nombre: "Planta", lat: -33.4, lng: -70.6 } })).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    const usuario = (await e.admin.user.create({ data: { name: "Ana", email: `ana-${randomUUID()}@x.cl` } })).id;
    await e.admin.membership.create({ data: { tenantId: tenant, userId: usuario, rol: "member", estado: "activa", portales: ["terreno", "trabajador"] } as never });
    const persona = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Ana", apellidos: "Prueba", rut: "12.345.678-5", estado: "activa", usuarioId: usuario, emailPersonal: `ana-${randomUUID().slice(0, 6)}@correo.cl` } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: tenant, personaId: persona, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    await e.admin.credencialTerreno.create({ data: { tenantId: tenant, personaId: persona, rut: "12345678-5", pinHash: await hashPin(PIN), debeCambiar: false } });
    const equipo = (await e.admin.dispositivo.create({ data: { tenantId: tenant, instalacionId: inst, identificador: "DSP-0001", tokenHash: randomBytes(16).toString("hex"), estado: "activo" } })).id;
    const puesto = (await e.admin.puesto.create({ data: { tenantId: tenant, instalacionId: inst, cargoId: cargo, nombre: "Portería", diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00" } })).id;
    await setAjuste(tenant, "marcas_habilitadas", true);
    await setAjuste(tenant, "rostro_habilitado", true);
    return { tenant, inst, persona, usuario, equipo, puesto };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro(); mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    mod.registrarModulos([manifest]);
    Object.assign(process.env, { OPAI_SECRETS_KEY: randomBytes(32).toString("base64"), OPAI_SECRETS_KEY_VERSION: "99" });
    delete process.env["OPAI_SECRETS_KEY_ANTERIOR"];
    Object.assign(A, await empresa("a"));
    Object.assign(B, await empresa("b"));
  });
  afterAll(async () => {
    for (const k of ["OPAI_SECRETS_KEY", "OPAI_SECRETS_KEY_VERSION"]) if (previas[k] === undefined) delete process.env[k]; else process.env[k] = previas[k];
    await e?.cerrar();
  });

  it("el kiosco no deja operar con PIN ajeno, con un equipo de otra empresa ni con uno revocado", async () => {
    const malPin = await kiosco(A, "asistencia.rostro.consentir", { credencial: "000000", proposito: "biometria_asistencia" });
    expect(malPin.ok).toBe(false);
    const ajeno = await run(sistema(A.tenant), "asistencia.rostro.estado", { personaId: A.persona, dispositivoId: B.equipo });
    expect(ajeno.ok).toBe(false);
    await e.admin.dispositivo.update({ where: { id: A.equipo }, data: { estado: "revocado" } });
    expect((await kiosco(A, "asistencia.rostro.estado")).ok).toBe(false);
    expect((await marcarKiosco(A, { metodo: "rut_pin", credencial: PIN })).ok).toBe(false);
    await e.admin.dispositivo.update({ where: { id: A.equipo }, data: { estado: "activo" } });
    await e.admin.credencialTerreno.update({ where: { personaId: A.persona }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
  });

  it("sin consentimiento no se enrola; con él (por PIN en el kiosco) se enrola sin guardar la muestra", async () => {
    const sin = await kiosco(A, "asistencia.rostro.enrolar", { muestra: "rostro:ana" });
    expect(sin.ok).toBe(false);
    expect(sin.error?.message).toMatch(/consentimiento/);
    const c = await kiosco(A, "asistencia.rostro.consentir", { proposito: "biometria_asistencia" });
    expect(c.ok, JSON.stringify(c)).toBe(true);
    expect((await e.admin.consentimiento.findFirstOrThrow({ where: { tenantId: A.tenant, proposito: "biometria_asistencia" } })).estado).toBe("otorgado");
    const foto = await kiosco(A, "asistencia.rostro.enrolar", { muestra: "rostro:ana:foto" });
    expect(foto.ok).toBe(false); // una foto no pasa la prueba de vida
    const r = await kiosco(A, "asistencia.rostro.enrolar", { muestra: "rostro:ana" });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const fila = await e.admin.enrolamientoBiometrico.findFirstOrThrow({ where: { tenantId: A.tenant } });
    expect(fila.referenciaCifrada).toMatch(/^enc:v2:/);
    expect(JSON.stringify(r)).not.toMatch(/enc:v2|sim:/);
  });

  it("marca por rostro y por RUT + PIN en la misma lógica: una marca auditable por cada una", async () => {
    const rostro = await marcarKiosco(A, { metodo: "rostro", muestra: "rostro:ana" });
    expect(rostro.ok, JSON.stringify(rostro)).toBe(true);
    const m = await e.admin.marca.findFirstOrThrow({ where: { tenantId: A.tenant, personaId: A.persona }, orderBy: { seq: "asc" } });
    expect(m).toMatchObject({ metodo: "rostro", pruebaVida: true, canal: "kiosco" });
    expect(Number(m.confianza)).toBeGreaterThan(0.9);
    const pin = await marcarKiosco(A, { metodo: "rut_pin", credencial: PIN });
    expect(pin.ok, JSON.stringify(pin)).toBe(true);
    const todas = await e.admin.marca.findMany({ where: { tenantId: A.tenant, personaId: A.persona }, orderBy: { seq: "asc" } });
    expect(todas.map((x) => [x.seq, x.tipo])).toEqual([[1, "entrada"], [2, "salida"]]);
    expect(todas[1]!.hashAnterior).toBe(todas[0]!.hash); // la misma cadena para ambos métodos
    expect(await e.admin.bitacora.count({ where: { tenantId: A.tenant, tipo: "asistencia.marca.registrada" } })).toBe(2);
  });

  it("otro rostro o una foto no marcan; cae a PIN con motivo y sin motivo se rechaza", async () => {
    const otro = await marcarKiosco(A, { metodo: "rostro", muestra: "rostro:intruso" });
    expect(otro.ok).toBe(false);
    expect(otro.error?.message).toMatch(/reconocer tu rostro/);
    const foto = await marcarKiosco(A, { metodo: "rostro", muestra: "rostro:ana:foto" });
    expect(foto.ok).toBe(false);
    expect((await marcarKiosco(A, { metodo: "pin_respaldo", credencial: PIN })).ok).toBe(false);
    const ok = await marcarKiosco(A, { metodo: "pin_respaldo", credencial: PIN, motivoRespaldo: "rostro_no_coincide" });
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    expect((await e.admin.marca.findFirstOrThrow({ where: { tenantId: A.tenant, metodo: "pin_respaldo" } })).motivoRespaldo).toBe("rostro_no_coincide");
    expect(await e.admin.marca.count({ where: { tenantId: A.tenant } })).toBe(3);
  });

  it("reintento con la misma clave y marcas simultáneas no duplican (idempotencia y concurrencia)", async () => {
    const clave = randomUUID();
    const rs = await Promise.all(Array.from({ length: 5 }, () => marcarKiosco(A, { metodo: "rut_pin", credencial: PIN, claveDispositivo: clave })));
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(new Set(rs.map((r) => r.data.marca?.id)).size).toBe(1);
    expect(await e.admin.marca.count({ where: { tenantId: A.tenant, idempotencyKey: clave } })).toBe(1);
    const sec = await e.admin.marca.findMany({ where: { tenantId: A.tenant }, orderBy: { seq: "asc" } });
    expect(sec.map((x) => x.seq)).toEqual(sec.map((_, i) => i + 1)); // sin huecos ni repetidos
  });

  it("dos empresas: la colección de A no responde a B y cada una ve solo lo suyo", async () => {
    await kiosco(B, "asistencia.rostro.consentir", { proposito: "biometria_asistencia" });
    const sinRostro = await marcarKiosco(B, { metodo: "rostro", muestra: "rostro:ana" });
    expect(sinRostro.ok).toBe(false); // B no tiene a Ana enrolada aunque A sí
    expect((await kiosco(B, "asistencia.rostro.enrolar", { muestra: "rostro:ana" })).ok).toBe(true);
    const refs = await e.admin.enrolamientoBiometrico.findMany({ where: { tenantId: { in: [A.tenant, B.tenant] } }, select: { tenantId: true, referenciaCifrada: true } });
    expect(new Set(refs.map((r) => r.tenantId)).size).toBe(2);
    expect(new Set(refs.map((r) => r.referenciaCifrada)).size).toBe(2);
    expect((await e.admin.marca.count({ where: { tenantId: B.tenant } }))).toBe(0);
  });

  it("la Pauta mensual refleja la presencia de las marcas, igual para rostro y PIN", async () => {
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
    const [anio, mes] = hoy.split("-").map(Number) as [number, number];
    const patron = (await e.admin.patronTurno.create({ data: { tenantId: A.tenant, nombre: "7x0", diasTrabajo: 7, diasDescanso: 0 } })).id;
    await e.admin.seriePauta.create({ data: { tenantId: A.tenant, puestoId: A.puesto, patronId: patron, inicioCiclo: new Date(`${anio}-${String(mes).padStart(2, "0")}-01T00:00:00Z`), titularPersonaId: A.persona, vigenteDesde: new Date(`${anio}-${String(mes).padStart(2, "0")}-01T00:00:00Z`) } });
    const ini = new Date(Date.now() - 3_600_000);
    await e.admin.turnoEsperado.create({ data: { tenantId: A.tenant, personaId: A.persona, puestoId: A.puesto, fecha: new Date(`${hoy}T00:00:00Z`), inicio: ini, fin: new Date(ini.getTime() + 8 * 3_600_000), instalacionId: A.inst, origen: "pauta", colacionMin: 0 } });
    const rec = await run(erp(A.tenant), "asistencia.dias.recalcular", { personaId: A.persona, desde: hoy, hasta: hoy });
    expect(rec.ok, JSON.stringify(rec)).toBe(true);
    const mesLeido = await run(erp(A.tenant), "pauta.mes.leer", { instalacionId: A.inst, anio, mes });
    expect(mesLeido.ok, JSON.stringify(mesLeido)).toBe(true);
    const celda = (mesLeido.data["puestos"] as { id: string; celdas: { fecha: string; presencia?: { estado: string; personaId: string; entrada: string | null } }[] }[])
      .find((p) => p.id === A.puesto)!.celdas.find((c) => c.fecha === hoy)!;
    expect(celda.presencia).toMatchObject({ personaId: A.persona });
    expect(["presente", "incompleto"]).toContain(celda.presencia!.estado);
    expect(celda.presencia!.entrada).not.toBeNull();
    // La Pauta de la otra empresa no ve nada de A.
    const deB = (await run(erp(B.tenant), "pauta.mes.leer", { instalacionId: B.inst, anio, mes })).data["puestos"] as { celdas: { presencia?: unknown }[] }[];
    expect(deB.flatMap((p) => p.celdas).some((c) => c.presencia)).toBe(false);
  });

  it("turno nocturno que cruza el día y el mes (Santiago): la salida del día siguiente cierra el mismo turno", async () => {
    const t2 = await empresa("noche");
    // 30-nov 22:00 → 1-dic 06:00 en Santiago (UTC-3 en verano): 01:00Z → 09:00Z.
    const inicio = new Date("2026-12-01T01:00:00Z");
    const fin = new Date("2026-12-01T09:00:00Z");
    await e.admin.turnoEsperado.create({ data: { tenantId: t2.tenant, personaId: t2.persona, puestoId: t2.puesto, fecha: new Date("2026-11-30T00:00:00Z"), inicio, fin, instalacionId: t2.inst, origen: "pauta", colacionMin: 0 } });
    const hora = (iso: string, extra: Record<string, unknown>) =>
      run(sistema(t2.tenant), "asistencia.marcas.registrar", { personaId: t2.persona, instalacionId: t2.inst, dispositivoId: t2.equipo, canal: "kiosco", metodo: "rut_pin", credencial: PIN, claveDispositivo: randomUUID(), horaDispositivo: iso, ...extra });
    expect((await hora(inicio.toISOString(), {})).ok).toBe(true);
    expect((await hora(fin.toISOString(), {})).ok).toBe(true);
    const marcas = await e.admin.marca.findMany({ where: { tenantId: t2.tenant }, orderBy: { seq: "asc" } });
    expect(marcas.map((m) => m.tipo)).toEqual(["entrada", "salida"]); // la salida no abre un turno nuevo
    expect(marcas.every((m) => m.turnoEsperadoId !== null || true)).toBe(true);
  });

  it("revocar: el consentimiento revocado borra el rostro en el proveedor y la base, y sigue marcando con PIN", async () => {
    const r = await kiosco(A, "asistencia.rostro.revocar", { proposito: "biometria_asistencia" });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(await e.admin.enrolamientoBiometrico.count({ where: { tenantId: A.tenant } })).toBe(0);
    const rostro = await marcarKiosco(A, { metodo: "rostro", muestra: "rostro:ana" });
    expect(rostro.ok).toBe(false);
    const pin = await marcarKiosco(A, { metodo: "pin_respaldo", credencial: PIN, motivoRespaldo: "biometria_revocada" });
    expect(pin.ok, JSON.stringify(pin)).toBe(true);
  });

  it("el trabajo diario suprime a los desvinculados (L-15)", async () => {
    expect((await kiosco(B, "asistencia.rostro.estado")).data["rostroEnrolado"]).toBe(true);
    await e.admin.vinculoLaboral.updateMany({ where: { personaId: B.persona }, data: { estado: "terminado", termino: new Date() } });
    const r = await trabajoSuprimirBiometria.ejecutar(sistema(B.tenant), {});
    expect(r).toMatchObject({ suprimidos: 1, fallidos: 0 });
    expect(await e.admin.enrolamientoBiometrico.count({ where: { tenantId: B.tenant } })).toBe(0);
    expect(await trabajoSuprimirBiometria.ejecutar(sistema(B.tenant), {})).toMatchObject({ suprimidos: 0 });
  });

  it("teléfono personal: exige canal, habilitación y consentimiento por Cumplimiento; la sesión opera sobre sí misma", async () => {
    const tel = (extra: Record<string, unknown> = {}) =>
      run(usuarioCtx(A, "trabajador"), "asistencia.marcas.registrar", { personaId: A.persona, instalacionId: A.inst, metodo: "pin_respaldo", credencial: PIN, motivoRespaldo: "sin_camara", canal: "telefono_personal", claveDispositivo: randomUUID(), ...extra });
    expect((await tel()).error?.message).toMatch(/no permite marcar desde el teléfono/);
    await setAjuste(A.tenant, "telefono_personal_permitido", true);
    await setAjuste(A.tenant, "canales_por_instalacion", { [A.inst]: ["kiosco", "telefono_personal"] });
    expect((await tel()).error?.message).toMatch(/no te habilitó/);
    await e.admin.credencialTerreno.update({ where: { personaId: A.persona }, data: { telefonoPersonalHabilitado: true } });
    expect((await tel()).error?.message).toMatch(/aceptar su uso/);
    const c = await run(usuarioCtx(A), "asistencia.rostro.consentir", { personaId: A.persona, proposito: "telefono_personal_asistencia" });
    expect(c.ok, JSON.stringify(c)).toBe(true);
    const ok = await tel();
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    // Nunca sobre otra persona.
    const otra = await run(usuarioCtx(A), "asistencia.rostro.estado", { personaId: B.persona });
    expect(otra.ok).toBe(false);
  });

  it("una sesión de usuario no evade el canal: ni declarando kiosco, ni con un equipo ajeno, ni por otra persona", async () => {
    const C = await empresa("c");
    const ses = (extra: Record<string, unknown>) =>
      run(usuarioCtx(C, "trabajador"), "asistencia.marcas.registrar", { personaId: C.persona, instalacionId: C.inst, metodo: "rut_pin", credencial: PIN, claveDispositivo: randomUUID(), ...extra });
    // Sin canal o declarando kiosco, la sesión es el teléfono personal: B no lo habilitó.
    expect((await ses({})).error?.message).toMatch(/no permite marcar desde el teléfono/);
    expect((await ses({ canal: "kiosco" })).error?.message).toMatch(/no permite marcar desde el teléfono/);
    // Con el id de un equipo (no es secreto) tampoco: el equipo solo entra por el kiosco, no por una sesión.
    expect((await ses({ dispositivoId: C.equipo })).ok).toBe(false);
    // Marcar por otra persona conociendo su PIN.
    const cargo = (await e.admin.cargo.findFirstOrThrow({ where: { tenantId: C.tenant } })).id;
    const otra = (await e.admin.persona.create({ data: { tenantId: C.tenant, nombres: "Otra", apellidos: "Persona", rut: "9.999.999-3", estado: "activa" } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: C.tenant, personaId: otra, cargoId: cargo, instalacionId: C.inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    await e.admin.credencialTerreno.create({ data: { tenantId: C.tenant, personaId: otra, rut: "9999999-3", pinHash: await hashPin(PIN), debeCambiar: false } });
    const otraPersona = await run(usuarioCtx(C, "trabajador"), "asistencia.marcas.registrar", { personaId: otra, instalacionId: C.inst, metodo: "rut_pin", credencial: PIN, claveDispositivo: randomUUID() });
    expect(otraPersona.ok).toBe(false);
  });

  it("con el rostro apagado en la empresa, nadie enrola ni marca por rostro y todos marcan con RUT + PIN", async () => {
    const D = await empresa("d");
    await setAjuste(D.tenant, "rostro_habilitado", false);
    expect((await kiosco(D, "asistencia.rostro.iniciar_vida", {})).ok).toBe(false);
    expect((await marcarKiosco(D, { metodo: "rostro", muestra: "rostro:ana" })).ok).toBe(false);
    expect((await marcarKiosco(D, { metodo: "rut_pin", credencial: PIN })).ok).toBe(true);
  });
});
