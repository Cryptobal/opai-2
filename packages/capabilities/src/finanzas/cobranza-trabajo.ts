// Trabajo diario de cobranza (BRIEF-29 · CAR-166): envía el recordatorio que toca a cada factura vencida.
// Silencio por defecto (ADR-020): si la empresa no activó los recordatorios automáticos, no hace nada.
// Un error en un documento no detiene a los demás; sale un paso por documento y por ejecución.
import { z } from "zod";

import { estaVencida, evaluarRecordatorio } from "@opai/domain";

import { defineTrabajo } from "../trabajos/registro";
import { documentosCobrables, idsDeApertura, parametrosCobranza } from "./cobranza-datos";
import { enviarRecordatorio } from "./cobranza-envio";

export const trabajoRecordatoriosCobranza = defineTrabajo({
  tipo: "finanzas.cobranza.recordatorios",
  descripcion:
    "Una vez al día envía por correo el recordatorio de cobro que toca a cada factura vencida, según la secuencia de la empresa y contando solo días hábiles. Solo actúa si la empresa activó los recordatorios automáticos.",
  payload: z.object({}).passthrough(),
  periodicidad: "diaria",
  async handler(ctx) {
    const p = await parametrosCobranza(ctx);
    if (!p.automatico || p.pasos.length === 0) return { activo: false, enviados: 0, omitidos: 0, fallidos: 0 };
    const vencidas = (await documentosCobrables(ctx)).filter((d) => estaVencida(d, p.hoy, p.plazoDefectoDias));
    // Las facturas de la apertura desde 1.0 quedan fuera de lo automático (decisión de Carlos, CAR-168).
    const deApertura = await idsDeApertura(ctx, vencidas);
    const docs = vencidas.filter((d) => !deApertura.has(d.id));
    const previos = docs.length
      ? await ctx.db.cobranzaGestion.findMany({
          where: { documentoId: { in: docs.map((d) => d.id) }, origen: "automatico", resultado: "enviado", paso: { not: null } },
          select: { documentoId: true, paso: true },
        })
      : [];
    let enviados = 0;
    let omitidos = 0;
    let fallidos = 0;
    for (const d of docs) {
      const decision = evaluarRecordatorio({
        doc: d,
        hoy: p.hoy,
        pasos: p.pasos,
        ambito: p.ambito,
        plazoDefectoDias: p.plazoDefectoDias,
        pasosEnviados: previos.filter((g) => g.documentoId === d.id).map((g) => g.paso as number),
      });
      if (decision.accion !== "enviar") continue;
      try {
        const r = await enviarRecordatorio(ctx, { documentoId: d.id, origen: "automatico", paso: decision.paso });
        if (r.estado === "enviado") enviados += 1;
        else if (r.estado === "omitido") omitidos += 1;
        else fallidos += 1;
      } catch {
        // Se reintenta mañana: el paso no quedó registrado como enviado.
        fallidos += 1;
      }
    }
    return { activo: true, enviados, omitidos, fallidos };
  },
});
