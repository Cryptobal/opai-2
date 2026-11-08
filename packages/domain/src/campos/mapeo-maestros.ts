// Filas de maestros (cuenta, contacto, instalación) a valores por clave canónica del catálogo.
// Puro: recibe objetos planos con solo las columnas que usa y no consulta nada. Un dato ausente
// queda `null`: no se inventa ni se completa (R-faltantes del contrato).
import type { ValorCampo } from "./tipos";

type Texto = string | null | undefined;
const t = (v: Texto): string | null => (v && v.trim() ? v.trim() : null);
const unir = (...partes: Texto[]): string | null => t(partes.map(t).filter(Boolean).join(", "));

export type FilaCuenta = {
  nombre: string;
  razonSocial?: Texto;
  rut?: Texto;
  giro?: Texto;
  calle?: Texto;
  comuna?: Texto;
  region?: Texto;
  emailDte?: Texto;
  escrituraNotaria?: Texto;
  clienteDesde?: Date | null;
};
export type FilaContacto = {
  nombres: string;
  apellidos: string;
  cargo?: Texto;
  email?: Texto;
  telefono?: Texto;
};
export type FilaInstalacion = {
  nombre: string;
  direccionFormateada?: Texto;
  calle?: Texto;
  comuna?: Texto;
  region?: Texto;
  placeId?: Texto;
};

export function valoresCuenta(c: FilaCuenta): Record<string, ValorCampo> {
  return {
    "cuenta.nombre": t(c.nombre),
    "cuenta.razon_social": t(c.razonSocial),
    "cuenta.rut": t(c.rut),
    "cuenta.giro": t(c.giro),
    "cuenta.direccion": unir(c.calle, c.comuna, c.region),
    "cuenta.email_dte": t(c.emailDte),
    "cuenta.escritura_notaria": t(c.escrituraNotaria),
    "cuenta.cliente_desde": c.clienteDesde ?? null,
  };
}

export function valoresContacto(c: FilaContacto): Record<string, ValorCampo> {
  return {
    "contacto.nombre": t(`${c.nombres} ${c.apellidos}`),
    "contacto.cargo": t(c.cargo),
    "contacto.email": t(c.email),
    "contacto.telefono": t(c.telefono),
  };
}

/** Enlace de mapa solo si hay un lugar identificable; nunca una URL armada con texto libre. */
function enlaceMapa(i: FilaInstalacion): string | null {
  const id = t(i.placeId);
  return id ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}` : null;
}

export function valoresInstalacion(i: FilaInstalacion): Record<string, ValorCampo> {
  return {
    "instalacion.nombre": t(i.nombre),
    "instalacion.direccion": t(i.direccionFormateada) ?? unir(i.calle, i.comuna, i.region),
    "instalacion.comuna": t(i.comuna),
    "instalacion.region": t(i.region),
    "instalacion.mapa_url": enlaceMapa(i),
  };
}

/** Deja solo las claves autorizadas: lo no autorizado ni se entrega ni se menciona. */
export function soloAutorizados(
  valores: Readonly<Record<string, ValorCampo>>,
  autorizadas: ReadonlySet<string>,
): Record<string, ValorCampo> {
  return Object.fromEntries(Object.entries(valores).filter(([k]) => autorizadas.has(k)));
}
