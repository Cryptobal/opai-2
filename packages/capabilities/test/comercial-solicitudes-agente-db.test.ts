import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { codigo, dato } from "./maestros-ayuda";

type Sol = {
  id: string;
  estado: string;
  canal: string;
  fuente: string | null;
  camposPropuestosAgente: string[];
};

describe("comercial · canal agente (GrowthBot) contra Postgres real", () => {
  let e: Entorno;
  let tenant = "";
  let keyId = "";
  let ownerUserId = "";
  const sufijo = randomUUID().slice(0, 8);

  const ctxAgente = () =>
    mod.crearContexto({
      tenantId: tenant,
      rol: "gerente",
      actor: { tipo: "agent", id: keyId, viaUserId: ownerUserId },
      modulosActivos: ["comercial"],
      agente: {
        apiKeyId: keyId,
        nombre: "GrowthBot prueba",
        presupuestoMensualMicro: null,
        autonomia: {},
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    tenant = (
      await e.admin.tenant.create({
        data: { slug: `growth-${sufijo}`, nombre: "Growth test", vertical: "seguridad" },
      })
    ).id;
    await sembrarComercial(e.admin.$extends({}), tenant);
    const owner = await e.admin.membership.findFirstOrThrow({
      where: { tenantId: tenant, rol: "owner" },
    });
    ownerUserId = owner.userId;
    keyId = (
      await e.admin.apiKey.create({
        data: {
          tenantId: tenant,
          userId: owner.userId,
          nombre: "GrowthBot test",
          prefijo: `gb${sufijo}`,
          hash: randomUUID(),
          scopes: ["comercial"],
          permisos: ["comercial:solicitudes.read", "comercial:solicitudes.manage"],
          heredaPermisos: false,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("un agente crea en canal agente, enriquece, busca duplicadas y la conversión pide aprobación", async () => {
    const creada = await dato<Sol>(ctxAgente(), "comercial.solicitudes.create", {
      textoOriginal: "Hola, necesitamos guardias.",
      email: "growth@example.com",
    });
    expect(creada).toMatchObject({ canal: "agente", estado: "nueva" });

    const dup = await dato<{ items: Sol[] }>(ctxAgente(), "comercial.solicitudes.buscar_duplicadas", {
      email: "growth@example.com",
    });
    expect(dup.items.some((x) => x.id === creada.id)).toBe(true);

    const enriquecida = await dato<Sol>(ctxAgente(), "comercial.solicitudes.enriquecer", {
      id: creada.id,
      empresa: "Atlas SpA",
      servicio: "Guardias 24/7",
      fuente: "LinkedIn Ads",
      notasAgente: "Interés alto; llamar mañana.",
    });
    expect(enriquecida.fuente).toBe("LinkedIn Ads");
    expect(enriquecida.camposPropuestosAgente).toEqual(
      expect.arrayContaining(["empresa", "servicio", "fuente", "email"]),
    );

    const ctxHumano = mod.crearContexto({
      tenantId: tenant,
      rol: "owner",
      actor: { tipo: "user", id: ownerUserId },
      modulosActivos: ["comercial"],
    });
    expect(
      await codigo(ctxHumano, "comercial.solicitudes.enriquecer", {
        id: creada.id,
        empresa: "Otra",
      }),
    ).toBe("FORBIDDEN");

    const previa = await dato<{ plan: unknown }>(
      ctxAgente(),
      "comercial.solicitudes.convertir",
      { id: creada.id },
      { dryRun: true },
    );
    expect(previa.plan).toBeTruthy();

    const pendiente = await mod.executeCapability(ctxAgente(), "comercial.solicitudes.convertir", {
      id: creada.id,
    });
    expect(pendiente).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });

    const acciones = await dato<{ capability: string }[]>(
      ctxAgente(),
      "comercial.solicitudes.acciones_agente",
      { id: creada.id },
    );
    expect(acciones.map((a) => a.capability)).toEqual(
      expect.arrayContaining([
        "comercial.solicitudes.create",
        "comercial.solicitudes.enriquecer",
        "comercial.solicitudes.convertir",
      ]),
    );
  });
});
