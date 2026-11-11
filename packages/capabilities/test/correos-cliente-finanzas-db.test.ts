import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Correo } from "@opai/integrations";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import { type PaginaCorreos, ctxPrueba, empresaCorreos } from "./correos-ayuda";
import { dato } from "./maestros-ayuda";

// CAR-233 (revisión de Codex, P1): la respuesta a una factura cita folio y monto; hereda el ámbito
// «finanzas» del hilo y queda oculta, como la factura, para quien no ve Finanzas (ADR-016).
describe("core.correos · respuestas a facturas bajo el bloqueo financiero", () => {
  let e: Entorno;
  let A: Awaited<ReturnType<typeof empresaCorreos>>;
  const enviados: Correo[] = [];
  const mailer = { nombre: "prueba", remitente: "Cobranza <cobranza@empresa-a.cl>", enviar: async (c: Correo) => void enviados.push(c) };
  const historial = (c: typeof A.c) => dato<PaginaCorreos>(c, "core.correos.historial", { entidadTipo: "cuenta", entidadId: A.cuentaId });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    A = await empresaCorreos(e, "Gamma", "https://www.cliente-gamma.cl");
  });
  afterAll(async () => void (await e?.cerrar()));

  it("la respuesta citando la factura no se ve sin Finanzas y sí con Finanzas", async () => {
    await mod.enviarCorreo(
      { db: A.c.db, tenantId: A.tenantId, correo: mailer, urlBase: "https://x.test" },
      "finanzas.venta.enviada_cliente", "ana@cliente-gamma.cl",
      { cliente: { nombre: "Gamma" }, documento: { tipo: "Factura electrónica", folio: 77, total: "$1.190.000", vencimiento: "10-12-2026" }, empresa: { nombre: "Empresa A" } },
      { historial: { origen: "factura", cuentaId: A.cuentaId } },
    );
    const asunto = enviados.at(-1)?.asunto ?? "";
    expect(asunto.length).toBeGreaterThan(0);
    const r = await dato<{ registrado: boolean }>(A.c, "core.correos.recibir", {
      mensajeId: "respuesta-factura", remitente: "Ana <ana@cliente-gamma.cl>", destinatarios: [], asunto: `RE: ${asunto}`,
      texto: "Recibida, gracias.\n\n> Factura electrónica folio 77 por $1.190.000", recibidoEn: new Date().toISOString(),
    });
    expect(r.registrado).toBe(true);
    expect(await e.admin.correoCliente.findFirstOrThrow({ where: { mensajeId: "respuesta-factura" } })).toMatchObject({ ambito: "finanzas" });

    const sinFinanzas = await historial(A.c);
    expect(sinFinanzas.items.some((i) => i.texto.includes("folio 77"))).toBe(false);
    const gerente = await historial(ctxPrueba(A.tenantId, "gerente", ["comercial", "finanzas"]));
    expect(gerente.items.some((i) => i.texto.includes("folio 77"))).toBe(false);
    const conFinanzas = await historial(ctxPrueba(A.tenantId, "owner", ["comercial", "finanzas"]));
    expect(conFinanzas.items.filter((i) => i.texto.includes("folio 77") || i.origen === "factura")).toHaveLength(2);
  });

  it("una respuesta con otro asunto no hereda el ámbito", async () => {
    await dato(A.c, "core.correos.recibir", {
      mensajeId: "otra-consulta", remitente: "ana@cliente-gamma.cl", destinatarios: [], asunto: "Consulta de turnos",
      texto: "¿Cambia el turno del lunes?", recibidoEn: new Date().toISOString(),
    });
    expect(await e.admin.correoCliente.findFirstOrThrow({ where: { mensajeId: "otra-consulta" } })).toMatchObject({ ambito: null });
  });
});
