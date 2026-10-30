// Firma electrónica del núcleo (CAR-82 · PR 1): política por clase (CA4), firmante de la empresa y
// firma automática del representante (R16, P5), con aislamiento por tenant, contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Ctx = ReturnType<typeof ModuloCapacidades.crearContexto>;

describe.skipIf(!urlPropietario)("firma · política y firmante de empresa en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const t: Record<"a" | "b", { tenantId: string; userId: string }> = {
    a: { tenantId: "", userId: "" },
    b: { tenantId: "", userId: "" },
  };

  const owner = (k: "a" | "b"): Ctx =>
    mod.crearContexto({
      tenantId: t[k].tenantId,
      actor: { tipo: "user", id: t[k].userId },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: t[k].userId, nombre: "Ana", email: "a@b.cl", platformRole: null },
      medidor,
    });

  async function dato<T>(ctx: Ctx, id: string, input: unknown, opts = {}): Promise<T> {
    const r = await mod.executeCapability(ctx, id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function codigo(ctx: Ctx, id: string, input: unknown, opts = {}): Promise<string> {
    const r = await mod.executeCapability(ctx, id, input, opts);
    return r.ok ? "OK" : r.error.code;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    for (const k of ["a", "b"] as const) {
      const s = randomUUID().slice(0, 8);
      const tenantId = (
        await e.admin.tenant.create({ data: { slug: `fir-${s}`, nombre: k, vertical: "seguridad" } })
      ).id;
      const userId = (
        await e.admin.user.create({
          data: { name: "Ana", email: `ana-${s}@prueba.cl`, emailVerified: true },
        })
      ).id;
      await e.admin.membership.create({ data: { tenantId, userId, rol: "owner", portales: ["erp"] } });
      t[k] = { tenantId, userId };
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  type Pol = { clase: string; nivelMinimo: string; personalizada: boolean };

  it("politica_get entrega el defecto legal de cada clase (N2 para contrato de trabajo)", async () => {
    const r = await dato<{ politicas: Pol[] }>(owner("a"), "core.firmas.politica_get", {});
    const contrato = r.politicas.find((p) => p.clase === "contrato_trabajo");
    expect(contrato).toMatchObject({ nivelMinimo: "N2", personalizada: false });
    // N3 nunca aparece en los niveles por defecto (apagada).
    const acta = r.politicas.find((p) => p.clase === "acta");
    expect(acta?.nivelMinimo).toBe("N1");
  });

  it("politica_set sube y fija la política; politica_get la devuelve personalizada", async () => {
    await dato(owner("a"), "core.firmas.politica_set", {
      clase: "recepcion_laboral",
      nivelMinimo: "N2",
      nivelesPermitidos: ["N2"],
    });
    const r = await dato<{ politicas: Pol[] }>(owner("a"), "core.firmas.politica_get", {
      clase: "recepcion_laboral",
    });
    expect(r.politicas[0]).toMatchObject({ nivelMinimo: "N2", personalizada: true });
  });

  it("CA4: no deja bajar un contrato de trabajo a N1", async () => {
    expect(
      await codigo(owner("a"), "core.firmas.politica_set", {
        clase: "contrato_trabajo",
        nivelMinimo: "N1",
        nivelesPermitidos: ["N1"],
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("N3 está apagada: rechaza fijarla como permitida", async () => {
    expect(
      await codigo(owner("a"), "core.firmas.politica_set", {
        clase: "propuesta_comercial",
        nivelMinimo: "N1",
        nivelesPermitidos: ["N1", "N3"],
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("dryRun no persiste la política", async () => {
    await dato(
      owner("a"),
      "core.firmas.politica_set",
      { clase: "acta_reunion", nivelMinimo: "N2", nivelesPermitidos: ["N2"] },
      { dryRun: true },
    );
    const r = await dato<{ politicas: Pol[] }>(owner("a"), "core.firmas.politica_get", {
      clase: "acta_reunion",
    });
    expect(r.politicas[0]?.personalizada).toBe(false);
  });

  it("firmante de empresa, autorización de firma automática: crear, reemplazar y revocar", async () => {
    const fe = await dato<{ id: string }>(owner("a"), "core.firmas.firmante_empresa_set", {
      usuarioId: t.a.userId,
      nombre: "Carla Rep",
      run: "16234567-8",
      nivelMaximo: "N2",
    });
    const a1 = await dato<{ id: string }>(owner("a"), "core.firmas.firma_automatica_autorizar", {
      firmanteEmpresaId: fe.id,
      clase: "anexo_contrato",
    });
    // Reautorizar la misma clase revoca la anterior (una sola vigente por clase).
    const a2 = await dato<{ id: string }>(owner("a"), "core.firmas.firma_automatica_autorizar", {
      firmanteEmpresaId: fe.id,
      clase: "anexo_contrato",
    });
    expect(a2.id).not.toBe(a1.id);
    const previa = await e.admin.autorizacionFirmaAutomatica.findUnique({ where: { id: a1.id } });
    expect(previa?.revocadaEn).not.toBeNull();
    // Revocar la vigente; revocar de nuevo es conflicto.
    await dato(owner("a"), "core.firmas.firma_automatica_revocar", { autorizacionId: a2.id });
    expect(
      await codigo(owner("a"), "core.firmas.firma_automatica_revocar", { autorizacionId: a2.id }),
    ).toBe("CONFLICT");
  });

  it("un agente (API key) no puede definir el firmante de la empresa (soloPersonas)", async () => {
    const agente = mod.crearContexto({
      tenantId: t.a.tenantId,
      actor: { tipo: "agent", id: randomUUID(), viaUserId: t.a.userId },
      rol: "owner",
      scopes: ["*"],
      agente: { apiKeyId: randomUUID(), nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
      medidor,
    });
    expect(
      await codigo(agente, "core.firmas.firmante_empresa_set", {
        usuarioId: t.a.userId,
        nombre: "Nadie",
      }),
    ).toBe("FORBIDDEN");
  });

  it("aislamiento: el tenant B no ve la política del A ni revoca su autorización", async () => {
    const r = await dato<{ politicas: Pol[] }>(owner("b"), "core.firmas.politica_get", {
      clase: "recepcion_laboral",
    });
    expect(r.politicas[0]?.personalizada).toBe(false);
    const fe = await dato<{ id: string }>(owner("a"), "core.firmas.firmante_empresa_set", {
      usuarioId: t.a.userId,
      nombre: "Carla Rep",
    });
    const a = await dato<{ id: string }>(owner("a"), "core.firmas.firma_automatica_autorizar", {
      firmanteEmpresaId: fe.id,
      clase: "contrato_servicio",
    });
    expect(
      await codigo(owner("b"), "core.firmas.firma_automatica_revocar", { autorizacionId: a.id }),
    ).toBe("NOT_FOUND");
  });
});
