import { dia } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { adaptadorSiiDe } from "./adaptador-sii";

type Push = (codigo: string, ok: boolean, mensaje: string, bloqueante: boolean) => void;

export async function chequeosCredencialesEmision(
  ctx: Contexto,
  proveedor: string,
  cfg: { rutEmisor: string | null; resolucionSiiNumero: number | null; resolucionSiiFecha: Date | null } | null,
  push: Push,
) {
  if (cfg?.rutEmisor) {
    push("rut_emisor", true, `RUT emisor ${cfg.rutEmisor}.`, false);
  } else {
    push("rut_emisor", false, "Falta el RUT emisor en la configuración DTE.", true);
  }

  if (cfg?.resolucionSiiNumero && cfg?.resolucionSiiFecha) {
    push(
      "resolucion_sii",
      true,
      `Resolución SII N° ${cfg.resolucionSiiNumero} del ${dia(cfg.resolucionSiiFecha)}.`,
      false,
    );
  } else if (proveedor !== "simulado") {
    push("resolucion_sii", false, "Indique número y fecha de resolución SII del emisor.", true);
  } else {
    push("resolucion_sii", true, "Resolución SII no requerida en modo simulado.", false);
  }

  const integ = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_emision" } },
  });
  const meta =
    integ?.config && typeof integ.config === "object"
      ? (integ.config as { certificadoMeta?: { venceEn?: string | null } }).certificadoMeta
      : undefined;
  if (proveedor !== "simulado") {
    const vence = meta?.venceEn?.slice(0, 10);
    const hoy = new Date().toISOString().slice(0, 10);
    const ok = integ?.estado === "configurada" && vence && vence >= hoy;
    push(
      "certificado",
      Boolean(ok),
      ok
        ? `Certificado vigente hasta ${vence}.`
        : vence && vence < hoy
          ? `Certificado vencido el ${vence}.`
          : "Suba el certificado .pfx en Configuración › Integraciones › Emisión DTE.",
      !ok,
    );
  } else {
    push("certificado", true, "Certificado no requerido en modo simulado.", false);
  }

  const adaptador = await adaptadorSiiDe(ctx);
  push(
    "adaptador",
    adaptador.disponible,
    adaptador.disponible
      ? "Adaptador SII listo (credenciales y resolución completas)."
      : "Faltan credenciales SimpleAPI, certificado o resolución para el adaptador real.",
    proveedor !== "simulado" && !adaptador.disponible,
  );
}
