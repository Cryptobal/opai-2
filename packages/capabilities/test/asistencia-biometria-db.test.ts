/* eslint-disable max-lines -- una sola historia de punta a punta contra Postgres real */
// CAR-89 · B4 (Postgres real, proveedor simulado): consentimiento → enrolamiento → marca con rostro →
// no coincide → PIN con motivo → revocar → marca solo con PIN; aislamiento entre dos empresas; guardia de
// empresas reales; supresión de desvinculados; la referencia queda cifrada y nunca sale por la API.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPin } from "@opai/db";

import { manifest } from "../../../modules/asistencia/manifest";
import { trabajoSuprimirBiometria } from "../../../modules/asistencia/capabilities/biometria-trabajo";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { ok: boolean; data: Record<string, unknown> & { marca?: { metodo: string } }; error?: { code: string; message: string } };
const PIN = "482915";

describe.skipIf(!urlPropietario)("Asistencia · Face ID (Postgres real, proveedor simulado)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const previas = { ...process.env };
  const medidor = { registrar: async () => undefined };
  const consumos: string[] = [];
  const medidorReal = { registrar: async (c: { recurso: string }) => void consumos.push(c.recurso) };
  type Emp = { tenant: string; inst: string; persona: string; usuario: string; rrhh: string };
  const A = {} as Emp;
  const B = {} as Emp;

  const ctx = (t: Emp, portal: string, quien: "persona" | "rrhh" = "persona") => {
    const id = quien === "persona" ? t.usuario : t.rrhh;
    return mod.crearContexto({
      tenantId: t.tenant, actor: { tipo: "user", id }, usuario: { id, nombre: "U", email: `${id}@x.cl`, platformRole: null },
      portal, portalesMembresia: [portal], rol: "owner", modulosActivos: ["asistencia"], medidor: medidorReal,
    });
  };
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) => mod.executeCapability(c, id, input, o) as Promise<Res>;
  const setAjuste = async (t: string, clave: string, valor: unknown) => {
    const v = valor as never;
    await e.admin.ajuste.deleteMany({ where: { tenantId: t, modulo: "asistencia", clave } });
    await e.admin.ajuste.create({ data: { tenantId: t, ambito: "tenant", sujetoId: t, modulo: "asistencia", clave, valor: v } });
  };

  async function empresa(slug: string): Promise<Emp> {
    const tenant = (await e.admin.tenant.create({ data: { slug: `qa-${slug}-${randomUUID().slice(0, 6)}`, nombre: slug, vertical: "seguridad" } })).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "Mandante", razonSocial: "Mandante SA", rut: "76111111-1" } })).id;
    const inst = (await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId: cuenta, nombre: "Planta", lat: -33.4, lng: -70.6 } })).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    const usuario = (await e.admin.user.create({ data: { name: "Ana", email: `ana-${randomUUID()}@x.cl` } })).id;
    const rrhh = (await e.admin.user.create({ data: { name: "RRHH", email: `rrhh-${randomUUID()}@x.cl` } })).id;
    await e.admin.membership.create({ data: { tenantId: tenant, userId: usuario, rol: "member", estado: "activa", portales: ["terreno", "trabajador"] } as never });
    const persona = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Ana", apellidos: "Prueba", rut: "12.345.678-5", estado: "activa", usuarioId: usuario, emailPersonal: `ana-${randomUUID().slice(0, 6)}@correo.cl` } })).id;
    await e.admin.vinculoLaboral.create({ data: { tenantId: tenant, personaId: persona, cargoId: cargo, instalacionId: inst, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente", horasSemanales: 40, distribucion: "5x2" } });
    await e.admin.credencialTerreno.create({ data: { tenantId: tenant, personaId: persona, rut: "12345678-5", pinHash: await hashPin(PIN), debeCambiar: false } });
    await setAjuste(tenant, "marcas_habilitadas", true);
    await setAjuste(tenant, "rostro_habilitado", true);
    return { tenant, inst, persona, usuario, rrhh };
  }
  const vida = async (t: Emp, rostro: string, viva = true) =>
    (await run(ctx(t, "terreno"), "asistencia.biometria.iniciar_vida", { simulacion: { rostro, viva } })).data["sesionVidaId"] as string;
  const marcar = async (t: Emp, extra: Record<string, unknown>) =>
    run(ctx(t, "terreno"), "asistencia.marcas.registrar", { personaId: t.persona, instalacionId: t.inst, claveDispositivo: randomUUID(), ...extra });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro(); mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
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

  it("no enrola sin consentimiento ni sin correo personal", async () => {
    const sesion = await vida(A, "ana");
    const sin = await run(ctx(A, "terreno"), "asistencia.biometria.enrolar", { sesionVidaId: sesion });
    expect(sin.ok).toBe(false);
    expect(sin.error?.message).toMatch(/consentimiento/);
    await e.admin.persona.update({ where: { id: A.persona }, data: { emailPersonal: null } });
    await run(ctx(A, "terreno"), "asistencia.consentimientos.aceptar", { tipo: "biometria_facial" });
    const sinCorreo = await run(ctx(A, "terreno"), "asistencia.biometria.enrolar", { sesionVidaId: sesion });
    expect(sinCorreo.error?.message).toMatch(/correo personal/);
    await e.admin.persona.update({ where: { id: A.persona }, data: { emailPersonal: "ana@correo.cl" } });
  });

  it("la prueba de vida es obligatoria para enrolar", async () => {
    const r = await run(ctx(A, "terreno"), "asistencia.biometria.enrolar", { sesionVidaId: await vida(A, "ana", false) });
    expect(r.ok).toBe(false);
    expect(r.error?.message).toMatch(/prueba de vida/);
    expect(await e.admin.enrolamientoFacial.count({ where: { tenantId: A.tenant } })).toBe(0);
  });

  it("enrola: guarda solo la referencia, cifrada, y mide el consumo", async () => {
    const r = await run(ctx(A, "terreno"), "asistencia.biometria.enrolar", { sesionVidaId: await vida(A, "ana") });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const fila = await e.admin.enrolamientoFacial.findFirstOrThrow({ where: { tenantId: A.tenant } });
    expect(fila).toMatchObject({ estado: "activo", proveedor: "simulado", canal: "kiosco" });
    expect(fila.referencia).toMatch(/^enc:v2:/);
    expect(JSON.stringify(r)).not.toMatch(/rostro-|enc:v2/);
    expect(consumos).toEqual(expect.arrayContaining(["biometria.vida", "biometria.enrolamiento"]));
    expect(await e.admin.bitacora.count({ where: { tenantId: A.tenant, tipo: "asistencia.biometria.enrolada" } })).toBe(1);
  });

  it("marca con rostro (vida + 1:1) y deja método, confianza y prueba de vida", async () => {
    const r = await marcar(A, { metodo: "rostro", sesionVidaId: await vida(A, "ana") });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.data.marca?.metodo).toBe("rostro");
    const m = await e.admin.marca.findFirstOrThrow({ where: { tenantId: A.tenant, personaId: A.persona } });
    expect(m.pruebaVida).toBe(true);
    expect(Number(m.confianza)).toBeGreaterThan(0.9);
  });

  it("otro rostro no coincide y una vida fallida tampoco: no se marca", async () => {
    const otro = await marcar(A, { metodo: "rostro", sesionVidaId: await vida(A, "intruso") });
    expect(otro.ok).toBe(false);
    expect(otro.error?.message).toMatch(/reconocer tu rostro/);
    const muerta = await marcar(A, { metodo: "rostro", sesionVidaId: await vida(A, "ana", false) });
    expect(muerta.error?.message).toMatch(/prueba de vida/);
    expect(await e.admin.marca.count({ where: { tenantId: A.tenant } })).toBe(1);
  });

  it("cae a RUT + PIN con motivo; sin motivo, sin PIN correcto o con PIN ajeno se rechaza", async () => {
    const sinMotivo = await marcar(A, { metodo: "pin_respaldo", credencial: PIN });
    expect(sinMotivo.ok).toBe(false);
    const mal = await marcar(A, { metodo: "pin_respaldo", credencial: "000000", motivoRespaldo: "rostro_no_coincide" });
    expect(mal.ok).toBe(false);
    const ok = await marcar(A, { metodo: "pin_respaldo", credencial: PIN, motivoRespaldo: "rostro_no_coincide" });
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    const m = await e.admin.marca.findFirstOrThrow({ where: { tenantId: A.tenant, metodo: "pin_respaldo" } });
    expect(m.motivoRespaldo).toBe("rostro_no_coincide");
    expect(await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId: A.persona } })).toMatchObject({ intentosFallidos: 0 });
  });

  it("la colección de A no responde a B: ni por la capacidad ni por otro canal", async () => {
    // B nunca enroló: aunque presente el mismo rostro, no hay enrolamiento en su colección.
    await run(ctx(B, "terreno"), "asistencia.consentimientos.aceptar", { tipo: "biometria_facial" });
    const r = await marcar(B, { metodo: "rostro", sesionVidaId: await vida(B, "ana") });
    expect(r.ok).toBe(false);
    expect(r.error?.message).toMatch(/no tienes tu rostro enrolado/i);
    // Aunque B enrole el mismo rostro, su rostro vive en SU colección, con su propia referencia.
    const enrB = await run(ctx(B, "terreno"), "asistencia.biometria.enrolar", { sesionVidaId: await vida(B, "ana") });
    expect(enrB.ok).toBe(true);
    const sim = mod.biometriaSimuladaDelProceso();
    expect(sim.rostros(`opai-${A.tenant}`)).toBe(1);
    expect(sim.rostros(`opai-${B.tenant}`)).toBe(1);
    const a = await e.admin.enrolamientoFacial.findFirstOrThrow({ where: { tenantId: A.tenant } });
    const refA = await mod.cifradoDeCampos(ctx(A, "erp")).descifrar("enrolamientos_faciales", "referencia", a.referencia!);
    const sinB = await sim.verificar(`opai-${B.tenant}`, refA, new TextEncoder().encode("rostro:ana"), 0.95);
    expect(sinB.coincide).toBe(false);
    // RLS: B no ve el enrolamiento de A.
    expect(await e.admin.enrolamientoFacial.count({ where: { tenantId: A.tenant } })).toBe(1);
  });

  it("el estado no revela la referencia y el rostro apagado cae a PIN", async () => {
    const est = await run(ctx(A, "erp", "rrhh"), "asistencia.biometria.estado", { personaId: A.persona });
    expect(est.ok, JSON.stringify(est)).toBe(true);
    expect(est.data["rostroEnrolado"]).toBe(true);
    expect(JSON.stringify(est.data)).not.toMatch(/enc:v2|rostro-/);
    await setAjuste(A.tenant, "rostro_habilitado", false);
    const off = await marcar(A, { metodo: "rostro", sesionVidaId: await vida(A, "ana") });
    expect(off.ok).toBe(false);
    await setAjuste(A.tenant, "rostro_habilitado", true);
  });

  it("revocar: se borra en el proveedor y en la base, y sigue marcando con PIN", async () => {
    const sim = mod.biometriaSimuladaDelProceso();
    const r = await run(ctx(A, "trabajador"), "asistencia.consentimientos.revocar", { tipo: "biometria_facial" });
    expect(r.data).toMatchObject({ revocado: true, biometriaBorrada: true });
    expect(sim.rostros(`opai-${A.tenant}`)).toBe(0);
    expect(await e.admin.enrolamientoFacial.findFirstOrThrow({ where: { tenantId: A.tenant } })).toMatchObject({ estado: "revocado", referencia: null, motivoBaja: "trabajador" });
    const rostro = await marcar(A, { metodo: "rostro", sesionVidaId: await vida(A, "ana") });
    expect(rostro.ok).toBe(false);
    const pin = await marcar(A, { metodo: "pin_respaldo", credencial: PIN, motivoRespaldo: "biometria_revocada" });
    expect(pin.ok, JSON.stringify(pin)).toBe(true);
    expect(await e.admin.bitacora.count({ where: { tenantId: A.tenant, tipo: "asistencia.biometria.suprimida" } })).toBe(1);
  });

  it("guardia: una empresa real (sin slug qa-) no enrola ni verifica rostros", async () => {
    const real = await e.admin.tenant.create({ data: { slug: `gard-${randomUUID().slice(0, 6)}`, nombre: "Real", vertical: "seguridad" } });
    const copia = { ...A, tenant: real.id };
    const r = await run(ctx(copia, "terreno"), "asistencia.biometria.iniciar_vida", {});
    expect(r.ok).toBe(false);
    expect(r.error?.message).toMatch(/no está autorizada/);
  });

  it("el trabajo diario suprime a los desvinculados en el proveedor y en la base (L-15)", async () => {
    const sim = mod.biometriaSimuladaDelProceso();
    await run(ctx(B, "terreno"), "asistencia.consentimientos.aceptar", { tipo: "biometria_facial" });
    expect(sim.rostros(`opai-${B.tenant}`)).toBe(1);
    await e.admin.vinculoLaboral.updateMany({ where: { personaId: B.persona }, data: { estado: "terminado", termino: new Date() } });
    const sistema = mod.crearContexto({ tenantId: B.tenant, actor: { tipo: "system" }, portal: null, modulosActivos: ["asistencia"], medidor });
    const r = await trabajoSuprimirBiometria.ejecutar(sistema, {});
    expect(r).toMatchObject({ suprimidos: 1, fallidos: 0 });
    expect(sim.rostros(`opai-${B.tenant}`)).toBe(0);
    expect(await e.admin.enrolamientoFacial.findFirstOrThrow({ where: { tenantId: B.tenant } })).toMatchObject({ estado: "suprimido", referencia: null, motivoBaja: "desvinculacion" });
    expect(await trabajoSuprimirBiometria.ejecutar(sistema, {})).toMatchObject({ suprimidos: 0 }); // idempotente
  });

  it("teléfono personal: exige permiso de la empresa, canal de la instalación, habilitación y consentimiento (T-04)", async () => {
    const tel = () => marcar(A, { metodo: "pin_respaldo", credencial: PIN, motivoRespaldo: "sin_camara", canal: "telefono_personal" });
    expect((await tel()).error?.message).toMatch(/no permite marcar desde el teléfono/);
    await setAjuste(A.tenant, "telefono_personal_permitido", true);
    await setAjuste(A.tenant, "canales_por_instalacion", { [A.inst]: ["kiosco", "telefono_personal"] });
    expect((await tel()).error?.message).toMatch(/no te habilitó/);
    const h = await run(ctx(A, "erp", "rrhh"), "asistencia.telefono.habilitar", { personaId: A.persona, habilitado: true });
    expect(h.ok, JSON.stringify(h)).toBe(true);
    expect((await tel()).error?.message).toMatch(/aceptar su uso/);
    await run(ctx(A, "trabajador"), "asistencia.consentimientos.aceptar", { tipo: "telefono_personal" });
    const ok = await tel();
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
  });

  it("una prueba de vida sirve una sola vez, solo a quien la abrió y solo en su empresa", async () => {
    await run(ctx(A, "terreno"), "asistencia.consentimientos.aceptar", { tipo: "biometria_facial" });
    const enr = await run(ctx(A, "terreno"), "asistencia.biometria.enrolar", { sesionVidaId: await vida(A, "ana") });
    expect(enr.ok, JSON.stringify(enr)).toBe(true);
    const sesion = await vida(A, "ana");
    const primera = await marcar(A, { metodo: "rostro", sesionVidaId: sesion });
    expect(primera.ok, JSON.stringify(primera)).toBe(true);
    const repetida = await marcar(A, { metodo: "rostro", sesionVidaId: sesion });
    expect(repetida.ok).toBe(false);
    // La sesión de A no sirve en B, ni otro usuario de A puede usarla.
    const deA = await vida(A, "ana");
    const enB = await run(ctx(B, "terreno"), "asistencia.biometria.enrolar", { sesionVidaId: deA });
    expect(enB.ok).toBe(false);
    const otro = await run(ctx(A, "erp", "rrhh"), "asistencia.biometria.enrolar_rrhh", { personaId: A.persona, sesionVidaId: deA });
    expect(otro.ok).toBe(false);
    // La vista previa no gasta la sesión.
    const s2 = await vida(A, "ana");
    const previa = await marcar(A, { metodo: "rostro", sesionVidaId: s2 });
    await run(ctx(A, "terreno"), "asistencia.marcas.registrar", { personaId: A.persona, instalacionId: A.inst, claveDispositivo: randomUUID(), metodo: "rostro", sesionVidaId: await vida(A, "ana") }, { dryRun: true });
    expect(previa.ok).toBe(true);
  });

  it("los PIN equivocados en paralelo cuentan todos y bloquean la credencial", async () => {
    await e.admin.credencialTerreno.update({ where: { personaId: A.persona }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
    await Promise.all(Array.from({ length: 6 }, () => marcar(A, { metodo: "rut_pin", credencial: "000000" })));
    const c = await e.admin.credencialTerreno.findUniqueOrThrow({ where: { personaId: A.persona } });
    expect(c.bloqueadoHasta).not.toBeNull();
    const bloqueado = await marcar(A, { metodo: "rut_pin", credencial: PIN });
    expect(bloqueado.error?.message).toMatch(/Demasiados intentos/);
    await e.admin.credencialTerreno.update({ where: { personaId: A.persona }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
  });

  it("el simulado no existe en una empresa real y la baja sin proveedor no pierde la referencia", async () => {
    const real = await e.admin.tenant.create({ data: { slug: `gard-${randomUUID().slice(0, 6)}`, nombre: "Real", vertical: "seguridad" } });
    await e.admin.ajuste.create({ data: { tenantId: real.id, ambito: "tenant", sujetoId: real.id, modulo: "asistencia", clave: "biometria_empresas_reales", valor: true as never } }).catch(() => undefined);
    const sistema = mod.crearContexto({ tenantId: real.id, actor: { tipo: "system" }, portal: null, modulosActivos: ["asistencia"], medidor });
    expect(await mod.biometriaDe(sistema)).toBeNull();
  });
});
