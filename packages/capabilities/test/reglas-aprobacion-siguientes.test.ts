// CAR-253: al aprobar una solicitud pedida por una regla, se encadenan los pasos que la pantalla de
// quien la pidió habría hecho sola (emitir → enviar al SII). Un paso que falla no deshace lo aprobado.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { reglaDeNegocio } from "../src/errores";
import { executeCapability } from "../src/execute";
import { limpiarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { USUARIO_DE_PRUEBA } from "../src/testing";
import type { Contexto } from "../src/types";
import { mundo } from "./reglas-aprobacion-mundo";

let enviados: string[] = [];
let fallaElEnvio = false;

const enviar = defineCapability({
  id: "core.prueba_dte.enviar",
  descripcion: "Envía al SII un documento de prueba ya emitido (capacidad de prueba de CAR-253).",
  permiso: null,
  input: z.object({ documentoId: z.string() }),
  output: z.object({ enviado: z.boolean() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(_ctx, input) {
    if (fallaElEnvio)
      throw reglaDeNegocio("El documento sigue firmado y sin enviar; puede reintentar el envío.");
    enviados.push(input.documentoId);
    return { enviado: true };
  },
});

const emitir = defineCapability({
  id: "core.prueba_dte.emitir_y_enviar",
  descripcion: "Emite un documento de prueba; al aprobarse por regla, encadena su envío al SII.",
  permiso: null,
  input: z.object({ monto: z.number().int() }),
  output: z.object({ id: z.string() }),
  efecto: "irreversible",
  dryRun: true,
  aprobable: {
    accion: "emitir_dte",
    monto: async (_ctx, i) => i.monto,
    siguientes: (doc) => [{ capability: enviar.id, input: { documentoId: doc.id } }],
  },
  async handler() {
    return { id: "doc-1" };
  },
});

beforeEach(() => {
  enviados = [];
  fallaElEnvio = false;
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, emitir, enviar]);
});

async function pedirYAprobar(
  pide: Contexto,
  aprueba: Contexto,
  tabla: ReturnType<typeof mundo>["tabla"],
) {
  await executeCapability(pide, emitir.id, { monto: 2_000_000 });
  const id = String(tabla("aprobacion")[0]?.["id"]);
  return executeCapability(aprueba, "core.aprobaciones.aprobar", { id });
}

describe("pasos siguientes tras aprobar (CAR-253)", () => {
  it("al aprobar una emisión pedida por una regla, el documento también se envía", async () => {
    const { ceci, beto, tabla } = mundo();
    const r = await pedirYAprobar(ceci, beto, tabla);
    expect(r).toMatchObject({
      ok: true,
      data: {
        estado: "aprobada",
        siguientes: [{ capability: enviar.id, ok: true, mensaje: null }],
      },
    });
    expect(enviados).toEqual(["doc-1"]);
    expect(tabla("aprobacion")[0]).toMatchObject({
      estado: "aprobada",
      resultado: expect.objectContaining({ siguientes: [expect.objectContaining({ ok: true })] }),
    });
  });

  it("si el envío falla, la emisión aprobada no se deshace y queda el motivo", async () => {
    const { ceci, beto, tabla } = mundo();
    fallaElEnvio = true;
    const r = await pedirYAprobar(ceci, beto, tabla);
    expect(r).toMatchObject({
      ok: true,
      data: {
        estado: "aprobada",
        resultado: { ok: true },
        siguientes: [{ ok: false, mensaje: expect.stringContaining("sin enviar") }],
      },
    });
    expect(tabla("aprobacion")[0]).toMatchObject({ estado: "aprobada" });
  });

  it("la vista previa de aprobar no envía nada", async () => {
    const { ceci, beto, tabla } = mundo();
    await executeCapability(ceci, emitir.id, { monto: 2_000_000 });
    const id = String(tabla("aprobacion")[0]?.["id"]);
    await executeCapability(beto, "core.aprobaciones.aprobar", { id }, { dryRun: true });
    expect(enviados).toEqual([]);
  });

  it("lo que pidió un agente sin regla no encadena: el agente da sus propios pasos", async () => {
    const { ana, tabla } = mundo();
    const agente: Contexto = {
      ...ana,
      actor: { tipo: "agent", id: "k1", viaUserId: USUARIO_DE_PRUEBA.id },
      agente: { apiKeyId: "k1", nombre: "Grok", presupuestoMensualMicro: null, autonomia: {} },
    };
    const pedido = await executeCapability(agente, emitir.id, { monto: 500_000 });
    expect(pedido).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    expect(tabla("aprobacion")[0]).toMatchObject({ reglaId: null });
    const id = String(tabla("aprobacion")[0]?.["id"]);
    const r = await executeCapability(ana, "core.aprobaciones.aprobar", { id });
    expect(r).toMatchObject({ ok: true, data: { estado: "aprobada" } });
    expect(enviados).toEqual([]);
  });
});
