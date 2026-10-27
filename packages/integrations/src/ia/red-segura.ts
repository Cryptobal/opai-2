// Defensa SSRF del baseUrl que el tenant configura en `ia_compatible` (ADR-027, ADR-049). Exige
// https y rechaza destinos internos (privados, loopback, link-local, metadata), también tras
// resolver el DNS (anti rebinding). Sin dependencias de Node al cargar el módulo: `node:dns` se
// importa de forma perezosa, solo en el servidor al pedir, para no romper el bundle del cliente.
import { ErrorIa } from "./http";

const RE_IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** true si una IPv4 (por su primer y segundo octeto) cae en un rango interno. */
function ipv4Interna(a: number, b: number): boolean {
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

/** Expande una IPv6 (con `::` y posible IPv4 embebida) a sus 16 bytes; null si no es válida. */
function bytesIpv6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zona = s.indexOf("%"); // scope (fe80::1%eth0): fuera
  if (zona >= 0) s = s.slice(0, zona);
  if (!s.includes(":")) return null;
  // IPv4 embebida en el último grupo (`::ffff:1.2.3.4` o `::1.2.3.4`): a dos hextets.
  const corte = s.lastIndexOf(":");
  const cola = s.slice(corte + 1);
  if (cola.includes(".")) {
    const m = RE_IPV4.exec(cola);
    if (!m) return null;
    const o = m.slice(1, 5).map(Number);
    if (o.some((n) => n > 255)) return null;
    const hex = (hi: number, lo: number) => (((hi << 8) | lo) >>> 0).toString(16);
    s = s.slice(0, corte + 1) + hex(o[0]!, o[1]!) + ":" + hex(o[2]!, o[3]!);
  }
  const mitades = s.split("::");
  if (mitades.length > 2) return null;
  const izq = mitades[0] ? mitades[0]!.split(":") : [];
  const der = mitades.length === 2 ? (mitades[1] ? mitades[1]!.split(":") : []) : null;
  const grupos =
    der === null ? izq : [...izq, ...Array(8 - izq.length - der.length).fill("0"), ...der];
  if (grupos.length !== 8) return null;
  const bytes: number[] = [];
  for (const g of grupos) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const v = parseInt(g, 16);
    bytes.push((v >> 8) & 0xff, v & 0xff);
  }
  return bytes;
}

/** Clasifica los 16 bytes de una IPv6 como destino interno (ADR-049). */
function ipv6Interna(b: number[]): boolean {
  // IPv4-mapped (::ffff:0:0/96) e IPv4-compatible (::/96, incluye `::` y `::1`): como IPv4.
  const mapeada = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;
  const compatible = b.slice(0, 12).every((x) => x === 0);
  if (mapeada || compatible) return ipv4Interna(b[12]!, b[13]!);
  const b0 = b[0]!;
  const b1 = b[1]!;
  if (b0 === 0xff) return true; // multicast ff00::/8
  if (b0 === 0xfe && (b1 & 0xc0) === 0x80) return true; // link-local fe80::/10
  if (b0 === 0xfe && (b1 & 0xc0) === 0xc0) return true; // site-local fec0::/10
  if ((b0 & 0xfe) === 0xfc) return true; // ULA fc00::/7
  if (b0 === 0 && b1 === 0x64 && b[2] === 0xff && b[3] === 0x9b && b.slice(4, 12).every((x) => x === 0))
    return true; // NAT64 64:ff9b::/96
  return false;
}

/** true si la IP (v4 o v6) cae en un rango interno que un baseUrl de tenant no debe alcanzar. */
export function ipInterna(ip: string): boolean {
  const v4 = RE_IPV4.exec(ip);
  if (v4) {
    const o = v4.slice(1, 5).map(Number);
    if (o.some((n) => n > 255)) return true; // IPv4 malformada: fail-closed
    return ipv4Interna(o[0]!, o[1]!);
  }
  const b = bytesIpv6(ip);
  return b === null ? true : ipv6Interna(b); // sin poder clasificar: fail-closed
}

/** Hostnames que siempre apuntan a un destino interno (el host ya viene normalizado). */
function hostnameInterno(host: string): boolean {
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal");
}

/** Normaliza el host: sin corchetes IPv6 (`[::1]` → `::1`), sin punto final (FQDN raíz) y en minúscula. */
const normalizarHost = (host: string) =>
  host
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "")
    .toLowerCase();
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
  const host = normalizarHost(u.hostname);
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
  const host = normalizarHost(u.hostname);
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
