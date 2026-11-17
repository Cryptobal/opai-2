import type { Resultado } from "@opai/capabilities";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

export type AccionBulk = "aprobar" | "rechazar";

export type SalidaBulk = { aplicadas: { codigoVisible: string }[]; omitidas: { motivo: string }[] };

export function textoVistaPrevia(d: SalidaBulk): string {
  return (
    `Listas: ${d.aplicadas.map((x) => x.codigoVisible).join(", ") || "ninguna"}.` +
    (d.omitidas.length ? ` Omitidas: ${d.omitidas.length}.` : "")
  );
}

export async function ejecutarBulk(
  accion: AccionBulk,
  ids: string[],
  motivo: string,
  dryRun: boolean,
): Promise<Resultado> {
  if (accion === "aprobar") {
    return ejecutarCapacidad("erp", "rendiciones.bandeja.aprobar_varias", { ids }, dryRun);
  }
  return ejecutarCapacidad("erp", "rendiciones.bandeja.rechazar_varias", { ids, motivo: motivo.trim() }, dryRun);
}