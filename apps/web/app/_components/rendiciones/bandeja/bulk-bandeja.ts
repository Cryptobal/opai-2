import type { Resultado } from "@opai/capabilities";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

export type AccionBulk = "aprobar" | "rechazar";

export type SalidaBulk = { aplicadas: { codigoVisible: string }[]; omitidas: { motivo: string }[] };

const cap = (accion: AccionBulk) =>
  accion === "aprobar" ? "rendiciones.bandeja.aprobar_varias" : "rendiciones.bandeja.rechazar_varias";

const entrada = (accion: AccionBulk, ids: string[], motivo: string) =>
  accion === "aprobar" ? { ids } : { ids, motivo: motivo.trim() };

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
  return ejecutarCapacidad("erp", cap(accion), entrada(accion, ids, motivo), dryRun);
}