import type { ResultadoPush } from "./index";

const TITULO_AVISO = "Tienes un aviso nuevo";

export type CuentaFirebase = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function b64urlDeTexto(t: string): string {
  return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDeBytes(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return b64urlDeTexto(s);
}

/** Firma JWT RS256 para OAuth de la cuenta de servicio de Firebase (sin SDK, ADR-031). */
export async function firmarJwtFirebase(
  cuenta: CuentaFirebase,
  ahora = Date.now(),
): Promise<string> {
  const cabeza = b64urlDeTexto(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const iat = Math.floor(ahora / 1000);
  const cuerpo = b64urlDeTexto(
    JSON.stringify({
      iss: cuenta.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: iat + 3600,
      iat,
    }),
  );
  const pem = cuenta.private_key.replace(/\\n/g, "\n");
  const pemCuerpo = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(pemCuerpo), (c) => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const datos = new TextEncoder().encode(`${cabeza}.${cuerpo}`);
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", clave, datos);
  return `${cabeza}.${cuerpo}.${b64urlDeBytes(new Uint8Array(firma))}`;
}

export interface EmisorFcm {
  avisar(token: string, plataforma: "ios" | "android", ruta: string): Promise<ResultadoPush>;
}

type TokenOAuth = { access_token: string; expires_in: number };

async function tokenOAuth(
  cuenta: CuentaFirebase,
  f: typeof fetch,
  ahora: number,
): Promise<string> {
  const jwt = await firmarJwtFirebase(cuenta, ahora);
  const r = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`fcm: token OAuth ${r.status}`);
  const d = (await r.json()) as TokenOAuth;
  return d.access_token;
}

function errorVencido(codigo: unknown): boolean {
  if (typeof codigo !== "string") return false;
  return codigo === "UNREGISTERED" || codigo === "NOT_FOUND";
}

/** Envía por FCM HTTP v1; sin red en pruebas con `fetch` inyectado. */
export function emisorFcm(cuenta: CuentaFirebase, f: typeof fetch = fetch): EmisorFcm {
  let cache: { token: string; expira: number } | null = null;
  const oauth = async (ahora: number) => {
    if (cache && ahora < cache.expira - 60_000) return cache.token;
    const token = await tokenOAuth(cuenta, f, ahora);
    cache = { token, expira: ahora + 3_500_000 };
    return token;
  };
  return {
    async avisar(token, _plataforma, ruta) {
      const rutaSegura = ruta.startsWith("/") ? ruta : "/bandeja";
      try {
        const ahora = Date.now();
        const bearer = await oauth(ahora);
        const url = `https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`;
        const mensaje = {
          message: {
            token,
            notification: { title: TITULO_AVISO, body: TITULO_AVISO },
            data: { ruta: rutaSegura },
            android: { priority: "high" },
            apns: {
              headers: { "apns-priority": "10" },
              payload: { aps: { sound: "default", badge: 1 } },
            },
          },
        };
        const enviado = await f(url, {
          method: "POST",
          signal: AbortSignal.timeout(5000),
          headers: {
            Authorization: `Bearer ${bearer}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mensaje),
        });
        if (enviado.ok) return { ok: true, estado: enviado.status, vencida: false };
        const cuerpo = (await enviado.json().catch(() => null)) as { error?: { status?: string } } | null;
        const vencida =
          enviado.status === 404 ||
          errorVencido(cuerpo?.error?.status) ||
          (typeof cuerpo?.error?.status === "string" && /not.?found|unregistered/i.test(cuerpo.error.status));
        return { ok: false, estado: enviado.status, vencida };
      } catch {
        return { ok: false, estado: 0, vencida: false };
      }
    },
  };
}

/** Lee `FIREBASE_SERVICE_ACCOUNT` (JSON). Sin cuenta válida, `null` (inactivo, no falla). */
export function emisorFcmDelEntorno(
  env: Record<string, string | undefined> = process.env,
): EmisorFcm | null {
  const crudo = env["FIREBASE_SERVICE_ACCOUNT"];
  if (!crudo?.trim()) return null;
  try {
    const j = JSON.parse(crudo) as CuentaFirebase;
    if (!j.project_id || !j.client_email || !j.private_key) return null;
    return emisorFcm(j);
  } catch {
    return null;
  }
}