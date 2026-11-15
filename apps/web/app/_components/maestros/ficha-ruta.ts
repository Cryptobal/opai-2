/** Raíz de una ficha maestra (`/cuentas/{id}`), con o sin pestaña en la ruta. */
const RAIZ_FICHA =
  /^(\/(?:cuentas|instalaciones|personas|cargos)\/[0-9a-f-]{36})/;

/** Pilotos CAR-546: Editar y Fijar van en la cabecera de la ficha, no en el shell. */
const FICHA_CABECERA = /^\/(cuentas|personas)\/[0-9a-f-]{36}/;

export function raizDeFicha(ruta: string): string | null {
  return ruta.match(RAIZ_FICHA)?.[1] ?? null;
}

export function fichaAccionesEnCabecera(ruta: string): boolean {
  return FICHA_CABECERA.test(ruta);
}