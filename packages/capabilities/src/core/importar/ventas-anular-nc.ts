// Una ND que anula (código 1) una NC la deja «anulada por ND», como al emitirla en OPAI.
// Solo se marca la NC de la misma planilla sin estado propio; una NC ya en OPAI no se toca.
import type { FilaPlan } from "./tipos";
import type { DatosDocumentoVenta } from "./ventas-campos";

const clave = (tipo: number, folio: number) => `${tipo}-${folio}`;

export function anularNcPorNd(
  planes: FilaPlan<DatosDocumentoVenta>[],
  filas: readonly { fila: number; datos: Record<string, unknown> }[],
  enOpai: Map<string, unknown>,
) {
  const sinEstado = new Set(filas.filter((f) => f.datos["estado_dte"] == null).map((f) => f.fila));
  const ncs = new Map(planes.filter((p) => p.accion === "crear" && p.datos?.tipoDte === 61).map((p) => [p.clave, p]));
  for (const nd of planes) {
    const d = nd.datos;
    if (nd.accion !== "crear" || d?.tipoDte !== 56 || d.codigoReferencia !== 1 || d.refTipoDte !== 61 || !d.refFolio) continue;
    // Una ND rechazada por el SII no anula nada (igual que al emitir en OPAI).
    if (d.estadoDte !== "aceptado" && d.estadoDte !== "enviado") continue;
    const k = clave(61, d.refFolio);
    const nc = ncs.get(k);
    if (!nc) {
      if (enOpai.has(k)) nd.mensajes.push("La nota de crédito que anula ya está en OPAI: su estado no se cambia.");
      continue;
    }
    // Solo si la NC va antes y es del mismo cliente; si no, se avisa y no se anula.
    if (nc.fila > nd.fila || nc.datos?.cuentaId !== d.cuentaId)
      nd.mensajes.push("No se anuló la nota de crédito: ponla antes de esta fila y revisa que sea del mismo cliente.");
    else if (nc.datos && sinEstado.has(nc.fila)) {
      nc.datos.estadoDte = "anulado_nd";
      nc.mensajes.push(`Queda anulada por la nota de débito de la fila ${nd.fila}.`);
    }
  }
}
