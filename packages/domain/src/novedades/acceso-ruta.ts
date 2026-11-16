/** Pantalla del menú con el módulo y el permiso que exige para verla (CAR-430). */
export type AccesoRuta = { href: string; modulo: string; permiso: string | null };

const sinConsulta = (ruta: string) => ruta.split(/[?#]/)[0] ?? ruta;

/**
 * Busca la entrada del menú que cubre la ruta de una novedad: la de prefijo más largo, para que
 * `/documentos/firmas` gane sobre `/documentos`. Sin entrada, la novedad no se recorta por ruta.
 */
export function accesoDeRuta(ruta: string, tabla: readonly AccesoRuta[]): AccesoRuta | undefined {
  const camino = sinConsulta(ruta);
  let mejor: AccesoRuta | undefined;
  for (const a of tabla) {
    const base = sinConsulta(a.href);
    if (base === "/" || !(camino === base || camino.startsWith(`${base}/`))) continue;
    if (!mejor || base.length > sinConsulta(mejor.href).length) mejor = a;
  }
  return mejor;
}
