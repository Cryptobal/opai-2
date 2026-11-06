import { createHmac, randomBytes, randomInt } from "node:crypto";

import { clienteApp } from "./client";

/**
 * Dispositivos de terreno (CAR-78 · B2). El código de emparejamiento y el token del dispositivo viajan a la
 * base solo como HMAC-SHA256 con un secreto del servidor: un volcado no los entrega y el espacio de un
 * código de 6 caracteres no se recorre sin el secreto. El emparejamiento y el reconocimiento ocurren antes
 * de que exista empresa fijada, por funciones `SECURITY DEFINER` (migración 20261108110000).
 */
const SAL = process.env["BETTER_AUTH_SECRET"] ?? "opai::dispositivos::sal-dev";

export const hmacDispositivo = (valor: string): string =>
  createHmac("sha256", SAL).update(`dispositivo\n${valor}`).digest("hex");

/** Sin 0/O/1/I/L para que se lea bien en una pantalla de portería. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LARGO_CODIGO = 6;
export const VIGENCIA_CODIGO_MIN = 10;

export const normalizarCodigo = (entrada: string): string | null => {
  const c = entrada.replace(/[\s-]/g, "").toUpperCase();
  return c.length === LARGO_CODIGO && [...c].every((x) => ALFABETO.includes(x)) ? c : null;
};

export const nuevoCodigoEmparejamiento = (): string =>
  Array.from({ length: LARGO_CODIGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");

export type DispositivoEmparejado = {
  token: string;
  tenantId: string;
  dispositivoId: string;
  instalacionId: string;
  identificador: string;
};

/** Consume el código y crea el dispositivo. `null` si no existe, venció o ya se usó (misma respuesta). */
export async function emparejarDispositivo(
  codigoEscrito: string,
  version: string | null,
): Promise<DispositivoEmparejado | null> {
  const codigo = normalizarCodigo(codigoEscrito);
  if (!codigo) return null;
  const token = randomBytes(32).toString("base64url");
  const filas = await clienteApp().$queryRaw<
    { tenant_id: string; dispositivo_id: string; instalacion_id: string; identificador: string }[]
  >`SELECT * FROM "core"."dispositivo_emparejar"(${hmacDispositivo(codigo)}, ${hmacDispositivo(token)}, ${version})`;
  const f = filas[0];
  return f
    ? {
        token,
        tenantId: f.tenant_id,
        dispositivoId: f.dispositivo_id,
        instalacionId: f.instalacion_id,
        identificador: f.identificador,
      }
    : null;
}

export type DispositivoReconocido = {
  tenantId: string;
  dispositivoId: string;
  instalacionId: string;
  identificador: string;
  estado: "activo" | "revocado";
  revocadoEn: Date | null;
};

/** Reconoce al dispositivo por su token en cada petición (también el revocado, para avisarle). */
export async function dispositivoPorToken(
  token: string,
  version: string | null,
): Promise<DispositivoReconocido | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const filas = await clienteApp().$queryRaw<
    {
      tenant_id: string;
      dispositivo_id: string;
      instalacion_id: string;
      identificador: string;
      estado: string;
      revocado_en: Date | null;
    }[]
  >`SELECT * FROM "core"."dispositivo_por_token"(${hmacDispositivo(token)}, ${version})`;
  const f = filas[0];
  if (!f) return null;
  return {
    tenantId: f.tenant_id,
    dispositivoId: f.dispositivo_id,
    instalacionId: f.instalacion_id,
    identificador: f.identificador,
    estado: f.estado === "activo" ? "activo" : "revocado",
    revocadoEn: f.revocado_en,
  };
}
