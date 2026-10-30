// Núcleo puro de la simulación: valida el export de 1.0 y formatea el reporte del plan. Sin fs ni
// consola ni base (se testea aislado). El plan lo calcula `planearImportacion1_0` de @opai/domain.
import { z } from "zod";

import { planearImportacion1_0, type Checkpoint1_0, type ResumenImportacion } from "@opai/domain";

/**
 * Checkpoint de 1.0 (formato SUPUESTO, a verificar contra el código de 1.0, brecha de `rondas.md`
 * §11). `qrCode` se trata como el contenido literal del QR impreso; si al verificar 1.0 resulta ser
 * un ID interno u otro formato, hay que ajustar el mapeo antes de aplicar nada.
 */
export const checkpointOpai1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  qrCode: z.string().nullish(),
  verificationMode: z.string().nullish(),
});
export type CheckpointOpai1 = z.infer<typeof checkpointOpai1>;

export const exportOpai1 = z.object({ checkpoints: z.array(checkpointOpai1) });

function aCheckpoint(c: CheckpointOpai1): Checkpoint1_0 {
  return { id: c.id, nombre: c.name, codigoQr: c.qrCode ?? null, modo: c.verificationMode ?? null };
}

export function planearDesdeExport(datos: unknown): ResumenImportacion {
  const parsed = exportOpai1.parse(datos);
  return planearImportacion1_0(parsed.checkpoints.map(aCheckpoint));
}

/** Reporte legible del plan. No imprime datos personales: solo nombres de punto y códigos. */
export function formatearReporte(r: ResumenImportacion): string {
  const lineas: string[] = [];
  lineas.push("Migración de etiquetas QR de Rondas desde OPAI 1.0 — SIMULACIÓN (solo lectura).");
  lineas.push(
    r.formatoQrVerificado
      ? "Formato del QR de 1.0: verificado."
      : "Formato del QR de 1.0: SIN VERIFICAR (a verificar). Se reutiliza el código físico tal cual, sin firmar.",
  );
  lineas.push(
    `Total ${r.total} · a importar ${r.aImportar} · omitidos ${r.omitidos} · con advertencia ${r.conAdvertencia}.`,
  );
  for (const p of r.planes) {
    const estado = p.accion === "importar" ? "IMPORTAR" : "OMITIR";
    const codigo = p.codigo ? ` [${p.codigo}]` : " [sin código físico]";
    lineas.push(`- ${estado} · ${p.nombre}${codigo}`);
    if (p.motivoOmision) lineas.push(`    omitido: ${p.motivoOmision}`);
    for (const a of p.advertencias) lineas.push(`    aviso: ${a}`);
  }
  lineas.push("No se escribió nada. La importación real la aplica el bot OPAI 2.0 con respaldo.");
  return lineas.join("\n");
}
