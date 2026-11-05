// Transporte HTTP de Octava: POST JSON con timeout y `fetch` inyectable (los tests nunca llaman a Octava).
import { OCTAVA_BASE_URL, type OctavaRespuestaBase } from "./octava-api";

export const OCTAVA_TIMEOUT_MS = 30_000;

export type FetchOctava = (url: string, init: RequestInit) => Promise<Response>;

export class OctavaApiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly httpStatus: number,
    readonly cuerpo: OctavaRespuestaBase | string,
    message: string,
  ) {
    super(message);
    this.name = "OctavaApiError";
  }
}

export type OpcionesOctava = { fetch?: FetchOctava; baseUrl?: string; timeoutMs?: number };

/** Octava responde el string "NULL" en lugar de vacío (Token, UrlAec): se trata como ausente. */
export function sinNull(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  return !t || t.toLowerCase() === "null" ? null : t;
}

export async function postOctava<TReq, TRes>(
  endpoint: string,
  body: TReq,
  op: OpcionesOctava = {},
): Promise<TRes> {
  const f: FetchOctava = op.fetch ?? ((u, i) => fetch(u, i));
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), op.timeoutMs ?? OCTAVA_TIMEOUT_MS);
  let res: Response;
  try {
    res = await f(`${op.baseUrl ?? OCTAVA_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: control.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error de red";
    throw new OctavaApiError(endpoint, 0, msg, `Octava ${endpoint}: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
  const texto = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new OctavaApiError(endpoint, res.status, texto.slice(0, 200), `Octava ${endpoint}: respuesta no es JSON (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new OctavaApiError(endpoint, res.status, json as OctavaRespuestaBase, `Octava ${endpoint}: HTTP ${res.status}`);
  }
  return json as TRes;
}
