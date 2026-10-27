// Defensa SSRF del baseUrl que el tenant configura en `ia_compatible` (ADR-027, ADR-049). Exige
// https y rechaza destinos internos (privados, loopback, link-local, metadata), también tras
// resolver el DNS (anti rebinding). Sin dependencias de Node al cargar el módulo: `node:dns` se
// importa de forma perezosa, solo en el servidor al pedir, para no romper el bundle del cliente.
import { ErrorIa } from "./http";

const RE_IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** true si la IP (v4 o v6) cae en un rango interno que un baseUrl de tenant no debe alcanzar. */
export function ipInterna(ip: string): boolean {
  const v4 = RE_IPV4.exec(ip);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return (
      a === 0 || // 0.0.0.0/8
      a === 10 || // privada
      a === 127 || // loopback
      (a === 169 && b === 254) || // link-local y metadata (169.254.169.254)
      (a === 172 && b >= 16 && b <= 31) || // privada
      (a === 192 && b === 168) || // privada
      (a === 100 && b >= 64 && b <= 127) // CGNAT
    );
  }
  const l = ip.toLowerCase();
  const mapeada = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(l);
  if (mapeada) return ipInterna(mapeada[1]!);
  return (
    l === "::1" || // loopback
    l === "::" || // sin especificar
    l.startsWith("fe80") || // link-local
    l.startsWith("fc") || // ULA
    l.startsWith("fd") // ULA
  );
}

/** Hostnames que siempre apuntan a un destino interno. */
function hostnameInterno(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal");
}

/** Quita los corchetes de un host IPv6 (`[::1]` → `::1`). */
const sinCorchetes = (host: string) => host.replace(/^\[/, "").replace(/\]$/, "");
const esIp = (host: string) => RE_IPV4.test(host) || host.includes(":");

/**
 * Chequeo sincrónico (sin DNS) de un baseUrl de tenant: exige https y rechaza hosts internos
 * evidentes (IP privada/loopback/link-local/metadata, localhost). Lo usa el catálogo al guardar.
 */
export function baseUrlEsPublica(valor: string): boolean {
  let u: URL;
  try {
    u = new URL(valor);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = sinCorchetes(u.hostname);
  if (!host || hostnameInterno(host)) return false;
  if (esIp(host) && ipInterna(host)) return false;
  return true;
}

async function resolverDns(host: string): Promise<readonly string[]> {
  const { lookup } = await import("node:dns/promises");
  const dirs = await lookup(host, { all: true });
  return dirs.map((d) => d.address);
}

/**
 * Validación completa antes de una petición (ADR-049): exige https, rechaza destinos internos y
 * resuelve el DNS para rechazar un host que resuelva a una IP interna. Lanza `ErrorIa` sin filtrar
 * la key. `resolver` es inyectable para las pruebas.
 */
export async function exigirDestinoPublico(
  baseUrl: string,
  proveedor: string,
  resolver: (host: string) => Promise<readonly string[]> = resolverDns,
): Promise<void> {
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new ErrorIa(proveedor, null, `${proveedor}: base URL inválida.`);
  }
  if (u.protocol !== "https:")
    throw new ErrorIa(proveedor, null, `${proveedor}: la base URL debe usar https.`);
  const host = sinCorchetes(u.hostname);
  if (!host || hostnameInterno(host))
    throw new ErrorIa(proveedor, null, `${proveedor}: destino interno no permitido.`);
  if (esIp(host)) {
    if (ipInterna(host))
      throw new ErrorIa(proveedor, null, `${proveedor}: destino interno no permitido.`);
    return;
  }
  let direcciones: readonly string[];
  try {
    direcciones = await resolver(host);
  } catch {
    throw new ErrorIa(proveedor, null, `${proveedor}: no se pudo resolver el destino.`);
  }
  if (direcciones.length === 0 || direcciones.some((d) => ipInterna(d)))
    throw new ErrorIa(proveedor, null, `${proveedor}: destino interno no permitido.`);
}
