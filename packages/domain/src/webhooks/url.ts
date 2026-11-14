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

/** IPv6 de loopback, sin especificar, local única, link-local o IPv4 mapeada a una interna. */
export function ipv6Interna(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (s === "::" || s === "::1") return true;
  const mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (mapeada?.[1]) return ipv4Interna(mapeada[1]);
  // `new URL` normaliza la IPv4 mapeada a hexadecimal: ::ffff:a00:1 es 10.0.0.1.
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(s);
  if (hex?.[1] && hex[2]) {
    const [alto, bajo] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
    return ipv4Interna(`${alto >> 8}.${alto & 255}.${bajo >> 8}.${bajo & 255}`);
  }
  return /^f[cd][0-9a-f]{2}:/.test(s) || /^fe[89ab][0-9a-f]:/.test(s);
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
  const host = u.hostname.replace(/\.$/, "");
  if (!host.includes(".") && !host.includes(":"))
    return "La dirección debe usar un dominio público.";
  if (NOMBRES_INTERNOS.test(host)) return "La dirección no puede apuntar a una red interna.";
  if (/^[\d.]+$/.test(host) || host.startsWith("[")) {
    if (ipInterna(host)) return "La dirección no puede apuntar a una red interna.";
  }
  return null;
}
