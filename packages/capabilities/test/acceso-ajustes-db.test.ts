// CAR-479 parte 1: los ajustes de acceso (tipos activos y entrada fuera de lista) contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";

describe.skipIf(!urlPropietario)("ajustes de Control de acceso (CAR-479)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let inst = "";
  let disp = "";
  const medidor = { registrar: async () => undefined };
  const ctx = () =>
    mod.crearContexto({
      tenantId: tenant,
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor,
      modulosActivos: ["acceso"],
    });
  const ajustar = (clave: string, valor: boolean) =>
    e.admin.ajuste.upsert({
      where: {
        tenantId_ambito_sujetoId_modulo_clave: {
          tenantId: tenant,
          ambito: "tenant",
          sujetoId: tenant,
          modulo: "acceso",
          clave,
        },
      },
      create: {
        tenantId: tenant,
        ambito: "tenant",
        sujetoId: tenant,
        modulo: "acceso",
        clave,
        valor,
      },
      update: { valor },
    });
  const entrar = async (tipoRegistro: string, numero: string) => {
    const clave = randomUUID();
    const r = await mod.executeCapability(ctx(), "core.hechos_terreno.recibir", {
      dispositivoId: disp,
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave,
          tipo: "acceso.entrada",
          payload: { tipoRegistro, documento: { tipo: "run", numero }, nombre: "Prueba" },
          horaHecho: new Date(Date.now() - 5_000).toISOString(),
        },
      ],
    });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const registro = await e.admin.registroAcceso.findFirst({ where: { clave } });
    return { r: JSON.stringify(r.data), registro };
  };

  beforeAll(async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarCapacidades(mod.capacidadesAcceso);
    const s = randomUUID().slice(0, 8);
    tenant = (
      await e.admin.tenant.create({ data: { slug: `aj-${s}`, nombre: "A", vertical: "seguridad" } })
    ).id;
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "C" } })).id;
    inst = (
      await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId, nombre: "Planta" } })
    ).id;
    disp = (
      await e.admin.dispositivo.create({
        data: {
          tenantId: tenant,
          instalacionId: inst,
          identificador: "DSP-1",
          estado: "activo",
          tokenHash: `aj-${s}`,
        },
      })
    ).id;
    await mod.executeCapability(ctx(), "acceso.listas.agregar", {
      instalacionId: inst,
      tipo: "autorizada",
      documento: { tipo: "run", numero: "11.111.111-1" },
    });
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("un tipo de registro apagado se rechaza con su motivo y sin registro", async () => {
    await ajustar("tipo_despacho", false);
    const x = await entrar("despacho", "11.111.111-1");
    expect(x.r).toContain("tipo_registro_inactivo");
    expect(x.registro).toBeNull();
    expect((await entrar("visita", "11.111.111-1")).registro).not.toBeNull();
  });

  it("con lista autorizada, «permitir fuera de lista» deja entrar a quien no está", async () => {
    expect((await entrar("visita", "9.876.543-3")).registro).toBeNull();
    await ajustar("permitir_fuera_de_lista", true);
    expect((await entrar("visita", "9.876.543-3")).registro).not.toBeNull();
  });
});
