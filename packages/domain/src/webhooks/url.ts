// CAR-352: qué dirección acepta un destino de eventos. Solo https y nunca la red interna: un
// destino apuntado a `localhost`, a la metadata de la nube o a una IP privada serviría para que
// OPAI haga peticiones a su propia infraestructura (SSRF). Al enviar se vuelve a revisar la IP
// resuelta; esta regla cubre lo que se ve en el texto de la dirección.

export const URL_WEBHOOK_MAX = 2048;

const NOMBRES_INTERNOS = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain)$/i;

/** IPv4 privada, de loopback, link-local, CGNAT, de prueba o reservada. */
export function ipv4Interna(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a = 0, b = 0] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** Las 8 partes de una IPv6 (admite «::» y una IPv4 al final), o null si no se puede leer. */
export function partesIpv6(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(s);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    s = `${s.slice(0, v4.index)}${(((a ?? 0) << 8) | (b ?? 0)).toString(16)}:${(((c ?? 0) << 8) | (d ?? 0)).toString(16)}`;
  }
  const lados = s.split("::");
  if (lados.length > 2) return null;
  const leer = (t: string | undefined) => (t ? t.split(":").map((g) => parseInt(g, 16)) : []);
  const izq = leer(lados[0]);
  const der = leer(lados[1]);
  const relleno = lados.length === 2 ? 8 - izq.length - der.length : 0;
  const partes = [...izq, ...Array<number>(Math.max(relleno, 0)).fill(0), ...der];
  if (partes.length !== 8 || partes.some((g) => Number.isNaN(g) || g < 0 || g > 0xffff))
    return null;
  return partes;
}

/**
 * Lista permitida, no prohibida: solo IPv6 global unicast (2000::/3). Así quedan fuera loopback,
 * IPv4 mapeada o compatible, NAT64, local única, link-local, site-local y multicast. Dentro de
 * 2000::/3 se excluyen además 6to4 (2002::/16), Teredo (2001::/32) y documentación (2001:db8::/32),
 * que llevan o simulan una IPv4 adentro.
 */
export function ipv6Interna(ip: string): boolean {
  const p = partesIpv6(ip);
  if (!p) return true;
  const [g0 = 0, g1 = 0] = p;
  if (g0 < 0x2000 || g0 > 0x3fff) return true;
  if (g0 === 0x2002) return true;
  return g0 === 0x2001 && (g1 === 0 || g1 === 0xdb8);
}

export function ipInterna(ip: string): boolean {
  return ip.includes(":") ? ipv6Interna(ip) : ipv4Interna(ip);
}

/** Motivo por el que la dirección no sirve, o `null` si sirve. */
export function problemaUrlWebhook(texto: string): string | null {
  if (texto.length > URL_WEBHOOK_MAX) return "La dirección es demasiado larga.";
  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    return "La dirección no es válida.";
  }
  if (u.protocol !== "https:") return "La dirección debe empezar con https://.";
  if (u.username || u.password) return "La dirección no puede llevar usuario ni contraseña.";
  if (u.hash) return "La dirección no puede llevar un fragmento (#).";
  const host = u.hostname.replace(/\.+$/, "");
  if (!host.includes(".") && !host.includes(":"))
    return "La dirección debe usar un dominio público.";
  if (NOMBRES_INTERNOS.test(host)) return "La dirección no puede apuntar a una red interna.";
  if (/^[\d.]+$/.test(host) || host.startsWith("[")) {
    if (ipInterna(host)) return "La dirección no puede apuntar a una red interna.";
  }
  return null;
}

/** Forma canónica que se guarda (esquema y dominio en minúsculas): la misma que se revisa al enviar. */
export function normalizarUrlWebhook(texto: string): string {
  return new URL(texto.trim()).href;
}
