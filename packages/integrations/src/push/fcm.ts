import { rutaPushInterna } from "@opai/domain";

import type { ResultadoPush } from "./index";
import { tokenFcmVencido } from "./fcm-errores";
import { type CuentaFirebase, firmarJwtFirebase } from "./fcm-jwt";

export type { CuentaFirebase } from "./fcm-jwt";
export { firmarJwtFirebase } from "./fcm-jwt";

const TITULO_AVISO = "Tienes un aviso nuevo";
const URL_OAUTH_GOOGLE = "https://oauth2.googleapis.com/token";
/** Firebase project ids solo usan minúsculas, números y guiones (evita path traversal en la URL FCM). */
export const PROJECT_ID_FCM = /^[a-z][a-z0-9-]{4,62}[a-z0-9]$/;

export interface EmisorFcm {
  avisar(token: string, plataforma: "ios" | "android", ruta: string): Promise<ResultadoPush>;
}

type TokenOAuth = { access_token?: string; expires_in?: number };

async function accessTokenOAuth(cuenta: CuentaFirebase, f: typeof fetch, ahora: number): Promise<string> {
  const jwt = await firmarJwtFirebase(cuenta, ahora);
  const r = await f(URL_OAUTH_GOOGLE, {
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
  const access = d.access_token;
  if (typeof access !== "string" || !access) throw new Error("fcm: token OAuth sin access_token");
  return access;
}

/** Envía por FCM HTTP v1; sin red en pruebas con `fetch` inyectado. */
export function emisorFcm(cuenta: CuentaFirebase, f: typeof fetch = fetch): EmisorFcm {
  let cache: { token: string; expira: number } | null = null;
  const oauth = async (ahora: number) => {
    if (cache && ahora < cache.expira - 60_000) return cache.token;
    const token = await accessTokenOAuth(cuenta, f, ahora);
    cache = { token, expira: ahora + 3_500_000 };
    return token;
  };
  return {
    async avisar(token, _plataforma, ruta) {
      const rutaSegura = rutaPushInterna(ruta);
      try {
        if (!PROJECT_ID_FCM.test(cuenta.project_id)) {
          return { ok: false, estado: 0, vencida: false };
        }
        const ahora = Date.now();
        const bearer = await oauth(ahora);
        const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(cuenta.project_id)}/messages:send`;
        const enviado = await f(url, {
          method: "POST",
          signal: AbortSignal.timeout(5000),
          headers: {
            Authorization: `Bearer ${bearer}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
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
          }),
        });
        if (enviado.ok) return { ok: true, estado: enviado.status, vencida: false };
        const cuerpo = (await enviado.json().catch(() => null)) as {
          error?: { status?: string; details?: { errorCode?: string }[] };
        } | null;
        const vencida = tokenFcmVencido(cuerpo?.error);
        return { ok: false, estado: enviado.status, vencida };
      } catch {
        return { ok: false, estado: 0, vencida: false };
      }
    },
  };
}

let emisorEntorno: EmisorFcm | null | undefined;

/** Lee `FIREBASE_SERVICE_ACCOUNT` (JSON). Sin cuenta válida, `null` (inactivo, no falla). */
export function emisorFcmDelEntorno(
  env: Record<string, string | undefined> = process.env,
): EmisorFcm | null {
  if (emisorEntorno !== undefined) return emisorEntorno;
  const crudo = env["FIREBASE_SERVICE_ACCOUNT"];
  if (!crudo?.trim()) {
    emisorEntorno = null;
    return null;
  }
  try {
    const j = JSON.parse(crudo) as CuentaFirebase;
    if (!j.project_id || !PROJECT_ID_FCM.test(j.project_id) || !j.client_email || !j.private_key) {
      emisorEntorno = null;
      return null;
    }
    emisorEntorno = emisorFcm(j);
    return emisorEntorno;
  } catch {
    emisorEntorno = null;
    return null;
  }
}