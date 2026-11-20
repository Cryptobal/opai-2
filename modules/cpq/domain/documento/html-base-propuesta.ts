import { parrafo, titulo } from "./html-fragmentos";

/** Marcador que inserta las secciones activas del armador (ver `html-secciones.ts`). */
const MARCADOR_SECCIONES = "{{secciones}}";

/**
 * Plantilla base de OPAI para la empresa que no tiene una propia en uso: portada con los datos de la cotización y las
 * secciones. Los datos van como texto, no como marcadores, para que ningún dato ausente impida generar el documento.
 */
export function htmlBasePropuesta(d: {
  titulo: string;
  negocio?: string | null;
  cliente?: string | null;
  validaHasta?: string | null;
}): string {
  return [
    titulo(1, d.titulo),
    d.negocio ? parrafo(d.negocio) : "",
    d.cliente ? parrafo(`Preparada para ${d.cliente}`) : "",
    d.validaHasta ? parrafo(`Vigencia hasta el ${d.validaHasta}`) : "",
    MARCADOR_SECCIONES,
  ].join("");
}
