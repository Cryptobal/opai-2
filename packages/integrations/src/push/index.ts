// Web Push con VAPID (ADR-044.4) por HTTP y WebCrypto, sin SDK (ADR-031). El aviso va **sin contenido**: el
// servicio de push del navegador (Google, Mozilla, Apple) solo recibe un «toque», nunca datos personales
// (Ley 21.719); el service worker muestra «Tienes un aviso nuevo» y abre el portal, donde está el detalle.

export type ClavesVapid = {
  /** Clave pública sin comprimir (65 bytes) en base64url, la misma que usa el navegador al suscribirse. */
  publica: string;
  /** Clave privada (32 bytes) en base64url. */
  privada: string;
  /** Contacto del emisor para el servicio de push: `mailto:` o `https:`. */
  sujeto: string;
};

export type ResultadoPush = { ok: boolean; estado: number; vencida: boolean };

export interface EmisorPush {
  /** Toca el dispositivo suscrito. `vencida` = el servicio dijo que la suscripción ya no existe. */
  avisar(endpoint: string): Promise<ResultadoPush>;
}

const b64url = {
  aBytes(s: string): Uint8Array {
    const b = atob(
      s
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(s.length / 4) * 4, "="),
    );
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  },
  deBytes(b: Uint8Array): string {
    let s = "";
    for (const x of b) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  deTexto(t: string): string {
    return b64url.deBytes(new TextEncoder().encode(t));
  },
};

async function importarPrivada(c: ClavesVapid): Promise<CryptoKey> {
  const pub = b64url.aBytes(c.publica);
  if (pub.length !== 65 || pub[0] !== 4)
    throw new Error("push: la clave pública VAPID no es P-256 sin comprimir");
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: c.privada,
    x: b64url.deBytes(pub.slice(1, 33)),
    y: b64url.deBytes(pub.slice(33, 65)),
    ext: false,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
}

/** JWT ES256 de VAPID para el origen del endpoint, válido 12 horas (el máximo permitido es 24). */
export async function firmarVapid(
  c: ClavesVapid,
  endpoint: string,
  ahora = Date.now(),
): Promise<string> {
  const aud = new URL(endpoint).origin;
  const cabeza = b64url.deTexto(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const cuerpo = b64url.deTexto(
    JSON.stringify({ aud, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: c.sujeto }),
  );
  const datos = new TextEncoder().encode(`${cabeza}.${cuerpo}`);
  const firma = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    await importarPrivada(c),
    datos,
  );
  return `${cabeza}.${cuerpo}.${b64url.deBytes(new Uint8Array(firma))}`;
}

/**
 * Servicios de push de los navegadores. El endpoint lo entrega el navegador, pero llega por la capacidad:
 * solo se acepta uno de estos hosts, para que OPAI nunca haga un POST a una URL cualquiera (SSRF).
 */
const HOSTS_PUSH = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^(web\.push|[a-z0-9-]+\.push)\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

/** ¿Es un endpoint https de un servicio de push conocido? */
export function endpointPushValido(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && HOSTS_PUSH.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

/** Emisor con claves VAPID. `fetch` se inyecta en las pruebas. */
export function emisorPush(c: ClavesVapid, f: typeof fetch = fetch): EmisorPush {
  // Clave pública en base64url sin relleno, aunque en Vercel venga con `=` o en base64 estándar.
  const clave = b64url.deBytes(b64url.aBytes(c.publica));
  return {
    async avisar(endpoint) {
      if (!endpointPushValido(endpoint)) return { ok: false, estado: 0, vencida: true };
      const jwt = await firmarVapid(c, endpoint);
      const r = await f(endpoint, {
        method: "POST",
        // Un servicio que no responde no debe colgar el despacho de eventos.
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: `vapid t=${jwt}, k=${clave}`,
          TTL: "86400",
          Urgency: "normal",
        },
      });
      return { ok: r.ok, estado: r.status, vencida: r.status === 404 || r.status === 410 };
    },
  };
}

/**
 * Emisor desde el entorno (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), que Carlos guarda en
 * Vercel. Sin las tres, `null`: el push queda apagado y el aviso sigue solo en la campana del portal.
 */
export function emisorPushDelEntorno(
  env: Record<string, string | undefined> = process.env,
): EmisorPush | null {
  const publica = env["VAPID_PUBLIC_KEY"];
  const privada = env["VAPID_PRIVATE_KEY"];
  const sujeto = env["VAPID_SUBJECT"];
  if (!publica || !privada || !sujeto) return null;
  return emisorPush({ publica, privada, sujeto });
}
