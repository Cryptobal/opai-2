import { avisar } from "@opai/ds";

import type { MovimientoMiDt } from "./lista-cumplimiento-dt";
import { descargarTexto } from "./descargar-texto";

type Ejecutar = <T>(id: string, input: object) => Promise<T | null>;

export async function exportarPendientesMiDt(ejecutar: Ejecutar) {
  const r = await ejecutar<{ nombre: string; contenido: string }>("nomina.midt.exportar_pendientes", {});
  if (r) {
    descargarTexto(r.nombre, r.contenido);
    avisar.exito("Archivo de pendientes descargado");
  }
}

export async function descargarDatosMiDt(ejecutar: Ejecutar, m: MovimientoMiDt) {
  const r = await ejecutar<{ nombre: string; contenido: string }>("nomina.midt.datos", {
    movimientoTipo: m.movimientoTipo,
    referenciaId: m.referenciaId,
  });
  if (r) descargarTexto(r.nombre, r.contenido);
}