// Lectores de la página de indicadores previsionales de Previred (CAR-193), uno por indicador.
// Cada uno devuelve null si no encuentra su patrón: una lectura que falla no contamina a las demás.
import { AFP, type AdministradoraAFP, type DatosIndicadores } from "./indicadores";
import { enteroChileno, porcentajeEscalado, ufEscalada } from "./previred-texto";

const NOMBRES_AFP: Record<AdministradoraAFP, RegExp> = {
  uno: /\bUno\b/, modelo: /\bModelo\b/, planvital: /\bPlan\s?Vital\b/i,
  habitat: /\bHabitat\b/i, capital: /\bCapital\b/, cuprum: /\bCuprum\b/i, provida: /\bPro\s?Vida\b/i,
};
const PCT = "(\\d{1,2},\\d{1,4}|\\d{1,2})\\s*%";

export function leerImm(texto: string): number | null {
  const m = /Dependientes e Independientes[^$]{0,60}\$\s*([\d.]+)/i.exec(texto);
  return m?.[1] ? enteroChileno(m[1]) : null;
}

export function leerTopes(texto: string): Pick<DatosIndicadores["topes"], "pensionSaludUf" | "ipsUf" | "cesantiaUf"> | null {
  const afp = /afiliados a una AFP\s*\((\d{1,3}(?:,\d+)?)\s*UF\)/i.exec(texto);
  const ips = /\bIPS(?:\s*\([^)]*\))?[^()]{0,20}\((\d{1,3}(?:,\d+)?)\s*UF\)/i.exec(texto);
  const ces = /Seguro de Cesant[ií]a[^()]{0,40}\((\d{1,3}(?:,\d+)?)\s*UF\)/i.exec(texto);
  const [a, i, c] = [afp?.[1], ips?.[1], ces?.[1]].map((s) => (s ? ufEscalada(s) : null));
  return a != null && i != null && c != null ? { pensionSaludUf: a, ipsUf: i, cesantiaUf: c } : null;
}

/** Comisión de cada AFP = tasa «cargo del trabajador» − cotización obligatoria vigente. */
export function leerComisionesAfp(texto: string, obligatoria: number): DatosIndicadores["afp"]["comisiones"] | null {
  const salida = {} as Record<AdministradoraAFP, number>;
  const desde = texto.search(/TASA COTIZACI[ÓO]N AFP/i);
  if (desde < 0) return null;
  const tabla = texto.slice(desde, desde + 1500);
  for (const afp of AFP) {
    const inicio = tabla.search(NOMBRES_AFP[afp]);
    const m = inicio < 0 ? null : new RegExp(PCT).exec(tabla.slice(inicio, inicio + 40));
    const trabajador = m?.[1] ? porcentajeEscalado(m[1]) : null;
    if (trabajador == null || trabajador < obligatoria) return null;
    salida[afp] = trabajador - obligatoria;
  }
  return salida;
}

export function leerSis(texto: string): number | null {
  const m = new RegExp(`SIS[^%\\d]{0,60}${PCT}`).exec(texto);
  return m?.[1] ? porcentajeEscalado(m[1]) : null;
}

export function leerCesantia(texto: string): DatosIndicadores["cesantia"] | null {
  const desde = texto.search(/Seguro de Cesant[ií]a \(AFC\)|SEGURO DE CESANT[ÍI]A/i);
  if (desde < 0) return null;
  const bloque = texto.slice(desde, desde + 900);
  const indefinido = new RegExp(`Indefinido[^%]*?${PCT}[^%]*?${PCT}`, "i").exec(bloque);
  const fijo = new RegExp(`Plazo Fijo[^%]*?${PCT}`, "i").exec(bloque);
  const [ie, it, pf] = [indefinido?.[1], indefinido?.[2], fijo?.[1]].map((s) => (s ? porcentajeEscalado(s) : null));
  return ie != null && it != null && pf != null
    ? { indefinidoEmpleador: ie, indefinidoTrabajador: it, plazoFijoEmpleador: pf }
    : null;
}
