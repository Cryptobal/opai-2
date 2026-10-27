// Brief 07d, PR 3: retención, anonimización y política contra Postgres real (opai_app sin
// BYPASSRLS). Verifica el trabajo diario (simula/aplica), los hechos regulados intactos, la
// exclusión por solicitud abierta, el aislamiento por tenant y la anonimización puntual de un
// titular (soloPersonas, vista previa, plazo de conservación, auditoría e idempotencia).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const HACE = (dias: number) => new Date(Date.now() - dias * 86_400_000);
const dia = (d: Date) => new Date(d.toISOString().slice(0, 10));

describe.skipIf(!urlPropietario)("cumplimiento PR3 (retención) en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  let uA = "";
  let uB = "";
  let cargo = "";
  let cuenta = "";
  const s = randomUUID().slice(0, 8);

  const ctx = (tenantId: string, userId: string, rol: "owner" | "supervisor" = "owner") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "ana", email: "ana@prueba.cl", platformRole: null },
      rol,
      medidor: { registrar: async () => undefined },
    });
  const agente = () =>
    mod.crearContexto({
      tenantId: tA,
      actor: { tipo: "agent", id: uA, viaUserId: uA },
      usuario: { id: uA, nombre: "ana", email: "ana@prueba.cl", platformRole: null },
      rol: "owner",
      scopes: ["*"],
      medidor: { registrar: async () => undefined },
    });
  const correrTrabajo = async (tenantId: string, userId: string) => {
    const t = mod.trabajosDelNucleo.find((x) => x.tipo === "core.cumplimiento.retencion");
    if (!t) throw new Error("trabajo no registrado");
    return (await t.ejecutar(ctx(tenantId, userId), { dia: "2026-10-27" })) as {
      activa: boolean;
      resultados: { tabla: string; modo: string; filas: number }[];
    };
  };
  const activar = (valor: boolean) =>
    mod.executeCapability(ctx(tA, uA), "core.config.set", {
      modulo: "core",
      clave: "cumplimiento_retencion_activa",
      valor,
    });
  const persona = (rut: string, extra: Record<string, unknown> = {}) =>
    e.admin.persona.create({
      data: { tenantId: tA, nombres: "Nombre", apellidos: "Apellido", rut, emailLaboral: `${rut}@x.cl`, telefono: "+56911111111", ...extra },
    });
  const vinculo = (personaId: string, v: { estado: string; inicio: Date; termino: Date | null }) =>
    e.admin.vinculoLaboral.create({
      data: { tenantId: tA, personaId, cargoId: cargo, tipo: "indefinido", ...v },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tA = (await tenant(`ret-a-${s}`)).id;
    tB = (await tenant(`ret-b-${s}`)).id;
    const user = (n: string) =>
      e.admin.user.create({ data: { name: n, email: `${n}-${s}@prueba.cl`, emailVerified: true } });
    uA = (await user("ana")).id;
    uB = (await user("beto")).id;
    for (const [t, u] of [[tA, uA], [tB, uB]] as const)
      await e.admin.membership.create({ data: { tenantId: t, userId: u, rol: "owner", portales: ["erp"] } });
    cargo = (await e.admin.cargo.create({ data: { tenantId: tA, nombre: "Guardia" } })).id;
    cuenta = (await e.admin.cuenta.create({ data: { tenantId: tA, nombre: "Cliente" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("con la política apagada (por defecto) solo simula: no toca datos y lo registra", async () => {
    await e.admin.envio.create({ data: { tenantId: tA, canal: "email", destinatario: "viejo@x.cl", estado: "enviado", createdAt: HACE(400) } });
    const r = await correrTrabajo(tA, uA);
    expect(r.activa).toBe(false);
    expect(r.resultados).toContainEqual({ tabla: "envios", modo: "simulacion", filas: 1 });
    const envio = await e.admin.envio.findFirstOrThrow({ where: { tenantId: tA } });
    expect(envio.destinatario).toBe("viejo@x.cl");
    const reg = await e.admin.retencionEjecucion.findFirstOrThrow({ where: { tenantId: tA, tabla: "envios" } });
    expect(reg).toMatchObject({ modo: "simulacion", origen: "trabajo", filas: 1, accion: "anonimizar" });
  });

  it("activa: anonimiza envíos vencidos, elimina invitaciones cerradas y respeta lo vigente", async () => {
    await e.admin.envio.create({ data: { tenantId: tA, canal: "email", destinatario: "reciente@x.cl", estado: "enviado", createdAt: HACE(10) } });
    const inv = (email: string, extra: Record<string, unknown>) =>
      e.admin.invitation.create({
        data: { tenantId: tA, email, rol: "viewer", portales: ["erp"], tokenHash: randomUUID(), invitedByUserId: uA, expiresAt: HACE(1), ...extra },
      });
    await inv("vencida@x.cl", { expiresAt: HACE(200) });
    await inv("aceptada@x.cl", { acceptedAt: HACE(150), expiresAt: HACE(160) });
    await inv("reciente@x.cl", { expiresAt: HACE(10) });
    await inv("pendiente@x.cl", { expiresAt: new Date(Date.now() + 86_400_000) });
    expect((await activar(true)).ok).toBe(true);
    const r = await correrTrabajo(tA, uA);
    expect(r.activa).toBe(true);
    const envios = await e.admin.envio.findMany({ where: { tenantId: tA }, orderBy: { createdAt: "asc" } });
    expect(envios.map((x) => x.destinatario)).toEqual(["[anonimizado]", "reciente@x.cl"]);
    const quedan = await e.admin.invitation.findMany({ where: { tenantId: tA } });
    expect(quedan.map((x) => x.email).sort()).toEqual(["pendiente@x.cl", "reciente@x.cl"]);
    expect(await e.admin.retencionEjecucion.count({ where: { tenantId: tA, modo: "aplicada" } })).toBe(2);
  });

  it("no toca otro tenant: la política es por tenant", async () => {
    await e.admin.envio.create({ data: { tenantId: tB, canal: "email", destinatario: "b@x.cl", estado: "enviado", createdAt: HACE(900) } });
    const r = await correrTrabajo(tB, uB);
    expect(r.activa).toBe(false);
    expect((await e.admin.envio.findFirstOrThrow({ where: { tenantId: tB } })).destinatario).toBe("b@x.cl");
  });

  it("anonimiza personas vencidas y conserva los hechos regulados; respeta vigentes y solicitudes abiertas", async () => {
    const vieja = await persona("11111111-1");
    await vinculo(vieja.id, { estado: "terminado", inicio: dia(HACE(3000)), termino: dia(HACE(2000)) });
    await e.admin.estructuraSueldo.create({
      data: { tenantId: tA, nivel: "persona", personaId: vieja.id, sueldoBase: 500000, motivo: "Excepción", vigenteDesde: dia(HACE(2500)) },
    });
    const reciente = await persona("22222222-2");
    await vinculo(reciente.id, { estado: "terminado", inicio: dia(HACE(900)), termino: dia(HACE(100)) });
    const vigente = await persona("33333333-3");
    await vinculo(vigente.id, { estado: "vigente", inicio: dia(HACE(3000)), termino: null });
    const conSolicitud = await persona("44444444-4");
    await vinculo(conSolicitud.id, { estado: "terminado", inicio: dia(HACE(3000)), termino: dia(HACE(2000)) });
    await e.admin.solicitudArco.create({ data: { tenantId: tA, tipo: "acceso", titularTipo: "persona", titularId: conSolicitud.id } });
    const sinVinculos = await persona("55555555-5");

    await correrTrabajo(tA, uA);

    const a = await e.admin.persona.findUniqueOrThrow({ where: { id: vieja.id } });
    expect(a).toMatchObject({ nombres: "[anonimizado]", apellidos: "", rut: `ANON-${vieja.id}`, emailLaboral: null, telefono: null, estado: "inactiva" });
    expect(a.anonimizadaEn).toBeInstanceOf(Date);
    // El hecho laboral queda íntegro (ADR-023): mismo vínculo, mismas fechas.
    const v = await e.admin.vinculoLaboral.findMany({ where: { personaId: vieja.id } });
    expect(v).toHaveLength(1);
    expect(v[0]?.estado).toBe("terminado");
    const sueldo = await e.admin.estructuraSueldo.findMany({ where: { personaId: vieja.id } });
    expect(sueldo.map((x) => x.sueldoBase)).toEqual([500000]);
    for (const intacta of [reciente, vigente, conSolicitud, sinVinculos]) {
      const p = await e.admin.persona.findUniqueOrThrow({ where: { id: intacta.id } });
      expect(p.anonimizadaEn).toBeNull();
      expect(p.telefono).toBe("+56911111111");
    }
  });

  it("anonimiza contactos archivados hace más de 2 años y deja los demás", async () => {
    const c = (nombres: string, extra: Record<string, unknown>) =>
      e.admin.contacto.create({ data: { tenantId: tA, cuentaId: cuenta, nombres, apellidos: "X", email: `${nombres}@x.cl`, ...extra } });
    const viejo = await c("viejo", { estado: "inactivo", archivadoEn: HACE(800) });
    const reciente = await c("reciente", { estado: "inactivo", archivadoEn: HACE(100) });
    const activo = await c("activo", {});
    await correrTrabajo(tA, uA);
    expect((await e.admin.contacto.findUniqueOrThrow({ where: { id: viejo.id } })).email).toBeNull();
    expect((await e.admin.contacto.findUniqueOrThrow({ where: { id: reciente.id } })).email).toBe("reciente@x.cl");
    expect((await e.admin.contacto.findUniqueOrThrow({ where: { id: activo.id } })).anonimizadoEn).toBeNull();
  });

  it("es idempotente: una segunda corrida no cambia nada más", async () => {
    const r = await correrTrabajo(tA, uA);
    expect(r.resultados).toEqual([]);
  });

  it("la política muestra reglas, estado activo y el registro; el supervisor no la lee", async () => {
    const r = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.retencion_politica", {});
    expect(r.ok).toBe(true);
    const d = r.ok ? (r.data as { activa: boolean; periodosPropuestos: boolean; reglas: { tabla: string; dias: number }[]; ejecuciones: unknown[] }) : null;
    expect(d?.activa).toBe(true);
    expect(d?.periodosPropuestos).toBe(true);
    expect(d?.reglas.find((x) => x.tabla === "personas")?.dias).toBe(1825);
    expect(d?.ejecuciones.length).toBeGreaterThan(0);
    const ajena = await mod.executeCapability(ctx(tB, uB), "core.cumplimiento.retencion_politica", {});
    const idsA = new Set((await e.admin.retencionEjecucion.findMany({ where: { tenantId: tA } })).map((x) => x.id));
    const deB = ajena.ok ? (ajena.data as { activa: boolean; ejecuciones: { id: string }[] }) : null;
    expect(deB?.activa).toBe(false);
    expect(deB?.ejecuciones.some((x) => idsA.has(x.id))).toBe(false);
    const sup = await mod.executeCapability(ctx(tA, uA, "supervisor"), "core.cumplimiento.retencion_politica", {});
    expect(!sup.ok && sup.error.code).toBe("FORBIDDEN");
  });

  describe("anonimización puntual de un titular (única purga forzada)", () => {
    it("un agente no puede (soloPersonas) y un supervisor tampoco", async () => {
      const p = await persona("66666666-6");
      const input = { titular: { tipo: "persona", id: p.id }, motivo: "Pedido del titular" };
      const a = await mod.executeCapability(agente(), "core.cumplimiento.titular_anonimizar", input);
      expect(!a.ok && a.error.code).toBe("FORBIDDEN");
      const sup = await mod.executeCapability(ctx(tA, uA, "supervisor"), "core.cumplimiento.titular_anonimizar", input);
      expect(!sup.ok && sup.error.code).toBe("FORBIDDEN");
    });

    it("otro tenant recibe NOT_FOUND, sin revelar si existe", async () => {
      const p = await persona("77777777-7");
      const r = await mod.executeCapability(ctx(tB, uB), "core.cumplimiento.titular_anonimizar", {
        titular: { tipo: "persona", id: p.id },
        motivo: "Pedido del titular",
      });
      expect(!r.ok && r.error.code).toBe("NOT_FOUND");
      expect((await e.admin.persona.findUniqueOrThrow({ where: { id: p.id } })).anonimizadaEn).toBeNull();
    });

    it("rechaza a quien tiene vínculo vigente o está dentro del plazo de conservación", async () => {
      const entrada = (id: string) => ({ titular: { tipo: "persona", id }, motivo: "Pedido del titular" });
      const vig = await persona("88888888-8");
      await vinculo(vig.id, { estado: "vigente", inicio: dia(HACE(500)), termino: null });
      const corta = await persona("99999999-9");
      await vinculo(corta.id, { estado: "terminado", inicio: dia(HACE(900)), termino: dia(HACE(30)) });
      for (const p of [vig, corta]) {
        // La vista previa informa por qué no procede (y desde cuándo); la real se rechaza.
        const prev = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", entrada(p.id), { dryRun: true });
        const d = prev.ok ? (prev.data as { elegible: boolean; motivo: string | null; procedeDesde: string | null }) : null;
        expect(d?.elegible).toBe(false);
        expect(d?.motivo).toBeTruthy();
        const real = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", entrada(p.id));
        expect(!real.ok && real.error.code).toBe("UNPROCESSABLE");
        expect((await e.admin.persona.findUniqueOrThrow({ where: { id: p.id } })).anonimizadaEn).toBeNull();
        expect(await e.admin.auditEvent.count({ where: { tenantId: tA, capability: "core.cumplimiento.titular_anonimizar", payload: { path: ["input", "titular", "id"], equals: p.id } } })).toBe(0);
      }
      const prevCorta = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", entrada(corta.id), { dryRun: true });
      expect(prevCorta.ok && (prevCorta.data as { procedeDesde: string | null }).procedeDesde).toBeTruthy();
    });

    it("la vista previa no escribe; la real anonimiza, audita, registra y es idempotente", async () => {
      const p = await persona("10101010-1");
      const sol = await e.admin.solicitudArco.create({ data: { tenantId: tA, tipo: "cancelacion", titularTipo: "persona", titularId: p.id } });
      const input = { titular: { tipo: "persona", id: p.id }, motivo: "Solicitud de cancelación", solicitudId: sol.id };
      const prev = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", input, { dryRun: true });
      expect(prev.ok && (prev.data as { elegible: boolean; anonimizado: boolean })).toMatchObject({ elegible: true, anonimizado: false });
      expect((await e.admin.persona.findUniqueOrThrow({ where: { id: p.id } })).anonimizadaEn).toBeNull();
      const real = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", input, { idempotencyKey: `k-${s}` });
      expect(real.ok && (real.data as { anonimizado: boolean }).anonimizado).toBe(true);
      const f = await e.admin.persona.findUniqueOrThrow({ where: { id: p.id } });
      expect(f).toMatchObject({ nombres: "[anonimizado]", emailLaboral: null });
      const reg = await e.admin.retencionEjecucion.findFirstOrThrow({ where: { tenantId: tA, origen: "titular", titularId: p.id } });
      expect(reg).toMatchObject({ filas: 1, solicitudId: sol.id, modo: "aplicada" });
      const filtro = { tenantId: tA, capability: "core.cumplimiento.titular_anonimizar", payload: { path: ["input", "titular", "id"], equals: p.id } };
      expect(await e.admin.auditEvent.count({ where: filtro })).toBe(1);
      const otra = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", input);
      expect(otra.ok && (otra.data as { yaEstabaAnonimizado: boolean }).yaEstabaAnonimizado).toBe(true);
      expect(await e.admin.retencionEjecucion.count({ where: { tenantId: tA, origen: "titular", titularId: p.id } })).toBe(1);
    });

    it("anonimiza un contacto y valida que la solicitud sea de cancelación del mismo titular", async () => {
      const c = await e.admin.contacto.create({ data: { tenantId: tA, cuentaId: cuenta, nombres: "Luis", apellidos: "Mena", email: "luis@x.cl" } });
      const otro = await e.admin.contacto.create({ data: { tenantId: tA, cuentaId: cuenta, nombres: "Eva", apellidos: "Mena" } });
      const acceso = await e.admin.solicitudArco.create({ data: { tenantId: tA, tipo: "acceso", titularTipo: "contacto", titularId: c.id } });
      const ajena = await e.admin.solicitudArco.create({ data: { tenantId: tA, tipo: "cancelacion", titularTipo: "contacto", titularId: otro.id } });
      for (const solicitudId of [acceso.id, ajena.id]) {
        const r = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", {
          titular: { tipo: "contacto", id: c.id }, motivo: "Pedido del titular", solicitudId,
        });
        expect(!r.ok && r.error.code).toBe("UNPROCESSABLE");
      }
      // La solicitud de acceso abierta lo frena (habría que entregarle sus datos primero).
      const frenada = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", {
        titular: { tipo: "contacto", id: c.id }, motivo: "Pedido del titular",
      });
      expect(!frenada.ok && frenada.error.code).toBe("UNPROCESSABLE");
      await e.admin.solicitudArco.update({ where: { id: acceso.id }, data: { estado: "resuelta" } });
      const ok = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", {
        titular: { tipo: "contacto", id: c.id }, motivo: "Pedido del titular",
      });
      expect(ok.ok && (ok.data as { anonimizado: boolean }).anonimizado).toBe(true);
      const f = await e.admin.contacto.findUniqueOrThrow({ where: { id: c.id } });
      expect(f).toMatchObject({ nombres: "[anonimizado]", email: null, estado: "inactivo" });
    });
  });

  describe("endurecimiento tras la autorrevisión", () => {
    it("un agente no activa la política ni acorta un periodo (ajuste solo de personas)", async () => {
      for (const [clave, valor] of [["cumplimiento_retencion_activa", true], ["cumplimiento_retencion_personas_dias", 1]] as const) {
        const r = await mod.executeCapability(agente(), "core.config.set", { modulo: "core", clave, valor });
        expect(!r.ok && r.error.code).toBe("FORBIDDEN");
      }
      const humano = await mod.executeCapability(ctx(tA, uA), "core.config.set", { modulo: "core", clave: "cumplimiento_retencion_personas_dias", valor: 1825 });
      expect(humano.ok).toBe(true);
    });

    it("una persona o contacto anonimizado no admite escrituras", async () => {
      const p = await persona("12121212-1");
      const sol = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", {
        titular: { tipo: "persona", id: p.id }, motivo: "Pedido del titular",
      });
      expect(sol.ok).toBe(true);
      const upd = await mod.executeCapability(ctx(tA, uA), "core.personas.update", { id: p.id, telefono: "+56922222222" });
      expect(!upd.ok && upd.error.code).toBe("UNPROCESSABLE");
      const vin = await mod.executeCapability(ctx(tA, uA), "core.vinculos.create", {
        personaId: p.id, cargoId: cargo, tipo: "indefinido", inicio: "2026-01-01",
      });
      expect(!vin.ok && vin.error.code).toBe("UNPROCESSABLE");
      expect((await e.admin.persona.findUniqueOrThrow({ where: { id: p.id } })).telefono).toBeNull();
    });

    it("una solicitud abierta que llegó solo con el correo frena la anonimización", async () => {
      const p = await persona("13131313-1", { emailPersonal: "pedro@x.cl" });
      await vinculo(p.id, { estado: "terminado", inicio: dia(HACE(3000)), termino: dia(HACE(2000)) });
      await e.admin.solicitudArco.create({ data: { tenantId: tA, tipo: "acceso", titularEmail: "pedro@x.cl" } });
      await correrTrabajo(tA, uA);
      expect((await e.admin.persona.findUniqueOrThrow({ where: { id: p.id } })).anonimizadaEn).toBeNull();
    });

    it("la purga puntual se rechaza si hay otra solicitud abierta del titular", async () => {
      const p = await persona("14141414-1");
      const canc = await e.admin.solicitudArco.create({ data: { tenantId: tA, tipo: "cancelacion", titularTipo: "persona", titularId: p.id } });
      await e.admin.solicitudArco.create({ data: { tenantId: tA, tipo: "portabilidad", titularTipo: "persona", titularId: p.id } });
      const r = await mod.executeCapability(ctx(tA, uA), "core.cumplimiento.titular_anonimizar", {
        titular: { tipo: "persona", id: p.id }, motivo: "Pedido del titular", solicitudId: canc.id,
      });
      expect(!r.ok && r.error.code).toBe("UNPROCESSABLE");
      expect((await e.admin.persona.findUniqueOrThrow({ where: { id: p.id } })).anonimizadaEn).toBeNull();
    });

    it("cada lote queda registrado en su propia transacción: si falla uno posterior, lo hecho consta", async () => {
      const { correrRegla } = await import("../src/core/cumplimiento/retencion-trabajo");
      const { EJECUTORES } = await import("../src/core/cumplimiento/retencion-reglas");
      const base = EJECUTORES.find((x) => x.regla.tabla === "envios");
      if (!base) throw new Error("falta el ejecutor de envíos");
      for (let i = 0; i < 2; i++)
        await e.admin.envio.create({ data: { tenantId: tA, canal: "email", destinatario: `lote${i}@x.cl`, estado: "enviado", createdAt: HACE(500) } });
      const antes = await e.admin.retencionEjecucion.count({ where: { tenantId: tA, tabla: "envios", modo: "aplicada" } });
      let llamadas = 0;
      const fallaElSegundo = {
        ...base,
        lote: async (...a: Parameters<typeof base.lote>) => {
          llamadas += 1;
          return llamadas === 1 ? (await base.lote(...a)).slice(0, 1) : ["00000000-0000-7000-8000-000000000000"];
        },
        aplicar: async (...a: Parameters<typeof base.aplicar>) => {
          if (llamadas >= 2) throw new Error("falla simulada del lote 2");
          return base.aplicar(...a);
        },
      };
      await expect(correrRegla(ctx(tA, uA), fallaElSegundo, 365, new Date(), true)).rejects.toThrow(/lote 2/);
      const filas = await e.admin.retencionEjecucion.findMany({ where: { tenantId: tA, tabla: "envios", modo: "aplicada" } });
      expect(filas.length).toBe(antes + 1);
      expect(filas.every((f) => f.filas > 0)).toBe(true);
      expect(await e.admin.envio.count({ where: { tenantId: tA, destinatario: { startsWith: "lote" } } })).toBe(1);
    });
  });
});
