// CAR-352: envío de un evento saliente a la dirección de una empresa (referente: Stripe).
// Firma `OPAI-Signature: t=<segundos>,v1=<hmac-sha256 hex de "t.cuerpo">` con el secreto del destino.
// La IP se valida al conectar (no solo al registrar la dirección): un dominio que resuelve a la red
// interna, o que cambia de IP entre una consulta y otra, no llega a conectarse. No sigue redirecciones.
import { createHmac } from "node:crypto";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import { isIP, type LookupFunction } from "node:net";

export const TIEMPO_MAXIMO_WEBHOOK_MS = 10_000;
/** Lo que se lee de la respuesta: el cuerpo no se guarda, solo se descarta. */
const BYTES_RESPUESTA = 64 * 1024;

export type EnvioWebhook = {
  url: string;
  secreto: string;
  cuerpo: string;
  eventoId: string;
  /** Devuelve true si la IP resuelta se puede contactar (la regla vive en @opai/domain). */
  ipPermitida: (ip: string) => boolean;
  ahora?: Date;
  timeoutMs?: number;
};

export type ResultadoWebhook = {
  ok: boolean;
  /** Código HTTP de la respuesta, o null si no hubo respuesta. */
  codigo: number | null;
  duracionMs: number;
  /** Motivo corto, sin datos de la respuesta. */
  error: string | null;
};

export function firmaWebhook(secreto: string, segundos: number, cuerpo: string): string {
  const v1 = createHmac("sha256", secreto).update(`${segundos}.${cuerpo}`).digest("hex");
  return `t=${segundos},v1=${v1}`;
}

/** `lookup` para `https.request`: resuelve y rechaza si alguna IP es interna. */
export function lookupSeguro(ipPermitida: (ip: string) => boolean): LookupFunction {
  return (host, opciones, cb) => {
    const familia = opciones.family === 4 || opciones.family === 6 ? opciones.family : 0;
    dnsLookup(host, { family: familia, all: true }, (err, lista: LookupAddress[]) => {
      if (err) return cb(err, "", 4);
      if (!lista.length || lista.some((d) => !ipPermitida(d.address))) {
        return cb(new Error("DESTINO_INTERNO"), "", 4);
      }
      if (opciones.all) return cb(null, lista);
      const [d] = lista;
      return cb(null, d?.address ?? "", d?.family ?? 4);
    });
  };
}

export function enviarWebhook(e: EnvioWebhook): Promise<ResultadoWebhook> {
  const inicio = Date.now();
  const segundos = Math.floor((e.ahora ?? new Date()).getTime() / 1000);
  const timeout = e.timeoutMs ?? TIEMPO_MAXIMO_WEBHOOK_MS;
  const fin = (r: Omit<ResultadoWebhook, "duracionMs">): ResultadoWebhook => ({
    ...r,
    duracionMs: Date.now() - inicio,
  });
  return new Promise((resolverUna) => {
    // Se resuelve una sola vez, y siempre dentro del plazo total (DNS, conexión, cabeceras y cuerpo):
    // `timeout` de `request` solo mide inactividad y un receptor lento podría retener la conexión.
    let hecho = false;
    const plazo: { id?: ReturnType<typeof setTimeout> } = {};
    const resolver = (r: ResultadoWebhook) => {
      if (hecho) return;
      hecho = true;
      clearTimeout(plazo.id);
      resolverUna(r);
    };
    let url: URL;
    try {
      url = new URL(e.url);
    } catch {
      return resolver(fin({ ok: false, codigo: null, error: "Dirección no válida" }));
    }
    if (url.protocol !== "https:") {
      return resolver(fin({ ok: false, codigo: null, error: "La dirección no es https" }));
    }
    // Con una IP escrita en la dirección, Node conecta sin pasar por `lookup`: se revisa aquí.
    const ipLiteral = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(ipLiteral) && !e.ipPermitida(ipLiteral)) {
      return resolver(
        fin({ ok: false, codigo: null, error: "La dirección resuelve a una red interna" }),
      );
    }
    const req = request(
      url,
      {
        method: "POST",
        lookup: lookupSeguro(e.ipPermitida),
        timeout,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(e.cuerpo),
          "user-agent": "OPAI-Webhooks/1",
          "opai-event-id": e.eventoId,
          "opai-signature": firmaWebhook(e.secreto, segundos, e.cuerpo),
        },
      },
      (res) => {
        let leidos = 0;
        res.on("data", (trozo: Buffer) => {
          leidos += trozo.length;
          if (leidos > BYTES_RESPUESTA) res.destroy();
        });
        const cerrar = () => {
          const codigo = res.statusCode ?? null;
          const ok = codigo !== null && codigo >= 200 && codigo < 300;
          resolver(fin({ ok, codigo, error: ok ? null : `Respondió ${codigo ?? "sin código"}` }));
        };
        res.on("end", cerrar);
        res.on("close", cerrar);
      },
    );
    req.on("timeout", () => req.destroy(new Error("TIEMPO_AGOTADO")));
    plazo.id = setTimeout(() => req.destroy(new Error("TIEMPO_AGOTADO")), timeout);
    req.on("error", (err) => {
      const motivo =
        err.message === "DESTINO_INTERNO"
          ? "La dirección resuelve a una red interna"
          : err.message === "TIEMPO_AGOTADO"
            ? `Sin respuesta en ${Math.round(timeout / 1000)} s`
            : "No se pudo conectar";
      resolver(fin({ ok: false, codigo: null, error: motivo }));
    });
    req.end(e.cuerpo);
  });
}
