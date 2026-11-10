// CAR-138 PR 7 · Referencias de clientes con consentimiento, contra Postgres real (si hay
// DATABASE_URL_TEST) con un rol sin BYPASSRLS: opt-in, revocación, vigencia, permisos y aislamiento.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Ref = Record<string, unknown>;
type Valores = { colecciones: { referencias: Ref[] }; origen: { referenciaCuentaIds: string[] } };
type Lista = { items: { cuentaId: string; vigente: boolean }[]; historial: { estado: string }[] };

describe.skipIf(!urlPropietario)("Referencias de clientes con opt-in · base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  const ids = {
    tA: "",
    tB: "",
    user: "",
    destino: "",
    destinoB: "",
    uno: "",
    dos: "",
    inactiva: "",
    prospecto: "",
    archivada: "",
    ajena: "",
    contactoDos: "",
  };

  const ctx = (tenantId: string, rol = "owner", extra: Record<string, unknown> = {}) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: ids.user },
      usuario: { id: ids.user, nombre: "Rosa", email: "rosa@prueba.cl", platformRole: null },
      rol: rol as never,
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
      ...extra,
    });
  const run = (c: ModuloCapacidades.Contexto, id: string, input: unknown, dryRun = false) =>
    mod.executeCapability(c, id, input, dryRun ? { dryRun: true } : {});
  const otorgar = (cuentaId: string, extra: Ref = {}) => ({
    cuentaId,
    confirmoConsentimientoExplicito: true,
    otorgadoEn: "2026-11-01",
    evidencia: "correo",
    evidenciaDetalle: "Correo ficticio de la gerencia",
    ...extra,
  });
  const referencias = async (t = ids.tA, cuentaId = ids.destino, finalidad = "propuesta") => {
    const r = await run(ctx(t), "core.campos.valores", { finalidad, cuentaId });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Valores;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    const tenant = async (slug: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `${slug}-${s}`, nombre: slug, vertical: "seguridad" },
        })
      ).id;
    ids.tA = await tenant("ref-a");
    ids.tB = await tenant("ref-b");
    ids.user = (
      await e.admin.user.create({
        data: { name: "Rosa", email: `rosa-${s}@prueba.cl`, emailVerified: true },
      })
    ).id;
    const cuenta = async (tenantId: string, nombre: string, estado: string) =>
      (
        await e.admin.cuenta.create({
          data: {
            tenantId,
            nombre,
            estado,
            giro: "Logística",
            comuna: "Quilicura",
            clienteDesde: new Date("2024-03-01"),
          },
        })
      ).id;
    ids.destino = await cuenta(ids.tA, "Destino Ficticio", "prospecto");
    ids.uno = await cuenta(ids.tA, "Ficticia Uno SpA", "cliente_activo");
    ids.dos = await cuenta(ids.tA, "Ficticia Dos SpA", "cliente_activo");
    ids.inactiva = await cuenta(ids.tA, "Ficticia Inactiva", "cliente_inactivo");
    ids.prospecto = await cuenta(ids.tA, "Ficticia Prospecto", "prospecto");
    ids.ajena = await cuenta(ids.tB, "Ajena Activa SpA", "cliente_activo");
    ids.destinoB = await cuenta(ids.tB, "Destino B", "prospecto");
    ids.archivada = await cuenta(ids.tA, "Ficticia Archivada", "cliente_activo");
    await e.admin.cuenta.update({
      where: { id: ids.archivada },
      data: { archivadaEn: new Date() },
    });
    ids.contactoDos = (
      await e.admin.contacto.create({
        data: { tenantId: ids.tA, cuentaId: ids.dos, nombres: "Leo", apellidos: "Ficticio" },
      })
    ).id;
    await e.admin.cuentaReferencia.create({
      data: {
        tenantId: ids.tB,
        cuentaId: ids.ajena,
        estado: "otorgado",
        otorgadoEn: new Date("2026-11-01"),
        evidencia: "correo",
        evidenciaDetalle: "ficticio",
        registradoPorId: ids.user,
        mostrarNombre: true,
      },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("por defecto no aparece nadie: sin consentimiento no hay referencias", async () => {
    expect((await referencias()).colecciones.referencias).toEqual([]);
  });

  it("otorgar en vista previa no escribe; el real sí, y sale anonimizado si no autorizó su nombre", async () => {
    expect(
      (await run(ctx(ids.tA), "core.cuentas_referencias.otorgar", otorgar(ids.uno), true)).ok,
    ).toBe(true);
    expect((await referencias()).colecciones.referencias).toEqual([]);
    expect(
      (
        await run(
          ctx(ids.tA),
          "core.cuentas_referencias.otorgar",
          otorgar(ids.uno, { mostrarNombre: true }),
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await run(
          ctx(ids.tA),
          "core.cuentas_referencias.otorgar",
          otorgar(ids.dos, { cita: "Muy puntuales." }),
        )
      ).ok,
    ).toBe(true);
    expect(
      (await run(ctx(ids.tA), "core.cuentas_referencias.otorgar", otorgar(ids.inactiva))).ok,
    ).toBe(true);
    const v = await referencias();
    expect(v.colecciones.referencias.map((r) => r["referencia.cliente"])).toEqual([
      "Cliente de Logística en Quilicura",
      "Ficticia Uno SpA",
    ]);
    expect(v.colecciones.referencias[0]?.["referencia.cita"]).toBe("Muy puntuales.");
    expect(v.origen.referenciaCuentaIds.sort()).toEqual([ids.uno, ids.dos].sort());
  });

  it("nunca incluye a la cuenta destinataria ni sale en contratos", async () => {
    expect((await referencias(ids.tA, ids.uno)).origen.referenciaCuentaIds).toEqual([ids.dos]);
    expect((await referencias(ids.tA, ids.destino, "contrato")).colecciones.referencias).toEqual(
      [],
    );
  });

  it("exige confirmación explícita, rechaza prospectos y fechas futuras", async () => {
    const { confirmoConsentimientoExplicito: _, ...sinConfirmar } = otorgar(ids.uno);
    const c = ctx(ids.tA);
    expect((await run(c, "core.cuentas_referencias.otorgar", sinConfirmar)).ok).toBe(false);
    expect((await run(c, "core.cuentas_referencias.otorgar", otorgar(ids.prospecto))).ok).toBe(
      false,
    );
    expect(
      (
        await run(
          c,
          "core.cuentas_referencias.otorgar",
          otorgar(ids.uno, { otorgadoEn: "2099-01-01" }),
        )
      ).ok,
    ).toBe(false);
  });

  it("quién autoriza es configurable: el gerente no puede por defecto, con excepción sí", async () => {
    const no = await run(
      ctx(ids.tA, "gerente"),
      "core.cuentas_referencias.otorgar",
      otorgar(ids.uno),
      true,
    );
    expect(no.ok).toBe(false);
    const permiso = "core:cuentas.referencias.autorizar";
    const si = ctx(ids.tA, "gerente", { excepciones: [{ permiso, conceder: true }] });
    expect((await run(si, "core.cuentas_referencias.otorgar", otorgar(ids.uno), true)).ok).toBe(
      true,
    );
  });

  it("revocar lo saca del próximo documento y queda en el historial; otorgar de nuevo lo vuelve a mostrar", async () => {
    const c = ctx(ids.tA);
    expect(
      (
        await run(c, "core.cuentas_referencias.revocar", {
          cuentaId: ids.uno,
          motivo: "El cliente lo pidió",
        })
      ).ok,
    ).toBe(true);
    expect((await referencias()).origen.referenciaCuentaIds).toEqual([ids.dos]);
    expect(
      (await run(c, "core.cuentas_referencias.revocar", { cuentaId: ids.uno, motivo: "Otra vez" }))
        .ok,
    ).toBe(false);
    const l = await run(c, "core.cuentas_referencias.list", { cuentaId: ids.uno, historial: true });
    expect(l.ok && (l.data as Lista).historial.map((h) => h.estado)).toEqual([
      "revocado",
      "otorgado",
    ]);
    await run(c, "core.cuentas_referencias.otorgar", otorgar(ids.uno));
    expect((await referencias()).origen.referenciaCuentaIds.sort()).toEqual(
      [ids.uno, ids.dos].sort(),
    );
  });

  it("un consentimiento vencido o de una cuenta inactiva no sale, aunque esté registrado", async () => {
    await e.admin.cuentaReferencia.create({
      data: {
        tenantId: ids.tA,
        cuentaId: ids.dos,
        estado: "otorgado",
        otorgadoEn: new Date("2025-01-01"),
        vigenteHasta: new Date("2025-12-31"),
        evidencia: "acta",
        evidenciaDetalle: "ficticio",
        registradoPorId: ids.user,
      },
    });
    expect((await referencias()).origen.referenciaCuentaIds).toEqual([ids.uno]);
    const l = await run(ctx(ids.tA), "core.cuentas_referencias.list", {});
    const items = l.ok ? (l.data as Lista).items : [];
    expect(items.find((i) => i.cuentaId === ids.inactiva)?.vigente).toBe(false);
    const vig = await run(ctx(ids.tA), "core.cuentas_referencias.list", { soloVigentes: true });
    expect(vig.ok && (vig.data as Lista).items.map((i) => i.cuentaId)).toEqual([ids.uno]);
  });

  it("rechaza cuenta archivada, vigencia ya vencida y un contacto de otra cuenta", async () => {
    const c = ctx(ids.tA);
    const otorgarA = (input: Ref) => run(c, "core.cuentas_referencias.otorgar", input, true);
    expect((await otorgarA(otorgar(ids.archivada))).ok).toBe(false);
    expect((await otorgarA(otorgar(ids.uno, { vigenteHasta: "2026-01-01" }))).ok).toBe(false);
    expect((await otorgarA(otorgar(ids.uno, { contactoId: ids.contactoDos }))).ok).toBe(false);
    expect((await otorgarA(otorgar(ids.dos, { contactoId: ids.contactoDos }))).ok).toBe(true);
  });

  it("la base exige evidencia al otorgar y motivo al revocar, aunque el código no los mande", async () => {
    const base = { tenantId: ids.tA, cuentaId: ids.uno, registradoPorId: ids.user };
    await expect(
      e.admin.cuentaReferencia.create({
        data: {
          ...base,
          estado: "otorgado",
          otorgadoEn: new Date("2026-11-01"),
          evidencia: "correo",
        },
      }),
    ).rejects.toThrow();
    await expect(
      e.admin.cuentaReferencia.create({ data: { ...base, estado: "revocado" } }),
    ).rejects.toThrow();
  });

  it("quien solo lee cuentas no ve el detalle de la evidencia ni el contacto", async () => {
    const l = await run(ctx(ids.tA, "viewer"), "core.cuentas_referencias.list", {
      cuentaId: ids.uno,
    });
    const item = l.ok ? (l.data as { items: Ref[] }).items[0] : undefined;
    expect(item?.["evidencia"]).toBe("correo");
    expect(item?.["evidenciaDetalle"]).toBeNull();
    const o = await run(ctx(ids.tA), "core.cuentas_referencias.list", { cuentaId: ids.uno });
    expect(o.ok && (o.data as { items: Ref[] }).items[0]?.["evidenciaDetalle"]).toBe(
      "Correo ficticio de la gerencia",
    );
  });

  it("manda el orden real de escritura: una revocación posterior gana aunque su transacción empezara antes", async () => {
    const base = { tenantId: ids.tA, cuentaId: ids.dos, registradoPorId: ids.user };
    await e.admin.cuentaReferencia.create({
      data: {
        ...base,
        estado: "otorgado",
        otorgadoEn: new Date("2026-11-01"),
        evidencia: "correo",
        evidenciaDetalle: "ficticio",
      },
    });
    expect((await referencias()).origen.referenciaCuentaIds).toContain(ids.dos);
    await e.admin.cuentaReferencia.create({
      data: {
        ...base,
        estado: "revocado",
        motivo: "carrera simulada",
        createdAt: new Date("2020-01-01"),
      },
    });
    expect((await referencias()).origen.referenciaCuentaIds).not.toContain(ids.dos);
  });

  it("un agente no puede registrar un consentimiento", async () => {
    const agente = ctx(ids.tA, "owner", {
      actor: { tipo: "agent", id: "agente-ref", viaUserId: ids.user },
    });
    expect((await run(agente, "core.cuentas_referencias.otorgar", otorgar(ids.uno), true)).ok).toBe(
      false,
    );
  });

  it("aislamiento: otra empresa no ve ni usa estas referencias, y el registro no se edita ni se borra", async () => {
    // Control positivo: en su empresa, la cuenta ajena sí sale; y ninguna de A se cuela.
    expect((await referencias(ids.tB, ids.destinoB)).origen.referenciaCuentaIds).toEqual([
      ids.ajena,
    ]);
    expect((await referencias()).origen.referenciaCuentaIds).not.toContain(ids.ajena);
    const otra = await run(ctx(ids.tB), "core.cuentas_referencias.otorgar", otorgar(ids.uno), true);
    expect(otra.ok).toBe(false);
    const app = e.forTenant(ids.tA);
    await expect(app.cuentaReferencia.updateMany({ data: { cita: "x" } })).rejects.toThrow();
    await expect(app.cuentaReferencia.deleteMany({})).rejects.toThrow();
    await expect(
      e.forTenant(ids.tB).cuentaReferencia.create({
        data: {
          tenantId: ids.tB,
          cuentaId: ids.uno,
          estado: "revocado",
          motivo: "cruzado",
          registradoPorId: ids.user,
        },
      }),
    ).rejects.toThrow();
  });
});
