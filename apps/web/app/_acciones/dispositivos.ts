"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSession } from "@opai/auth";
import { emparejarDispositivo, normalizarCodigo } from "@opai/db";

import { qrSvg } from "@/lib/qr";
import { COOKIE_DISPOSITIVO } from "@/lib/dispositivo";
import { ipDeCabeceras, permitir } from "@/lib/rate-limit";

/** SVG del QR de emparejamiento (solo con sesión): el codificador vive en el servidor (ADR-037). */
export async function qrDeEmparejamiento(texto: string): Promise<string | null> {
  if (!(await getSession()) || texto.length > 200) return null;
  return qrSvg(texto);
}

export type EstadoEmparejar = { tipo: "inicial" } | { tipo: "error"; n: number; texto: string };

const VENTANA_MS = 10 * 60_000;
const VERSION_APP = "terreno-web-1";

/**
 * Terreno › Emparejar (CAR-78 · B2). El código (6 caracteres, 10 minutos, un solo uso) se canjea por un
 * token propio del dispositivo, que queda en una cookie HttpOnly. Un código equivocado no se puede
 * atribuir a ningún código real, así que los 3 intentos se cuentan por origen cada 10 minutos (fallo
 * cerrado); además hay un tope global. Código inexistente, vencido o usado responden igual.
 */
export async function accionEmparejar(
  previo: EstadoEmparejar,
  form: FormData,
): Promise<EstadoEmparejar> {
  const n = ("n" in previo ? previo.n : 0) + 1;
  const origen = ipDeCabeceras(await headers());
  const permitido =
    (await permitir(`emparejar-origen:${origen}`, 3, VENTANA_MS, { fallarCerrado: true })) &&
    (await permitir("emparejar-global", 60, VENTANA_MS, { fallarCerrado: true }));
  if (!permitido) {
    return {
      tipo: "error",
      n,
      texto:
        "Hubo demasiados intentos. Pide un código nuevo en el ERP y vuelve a intentarlo en unos minutos.",
    };
  }
  const codigo = normalizarCodigo(String(form.get("codigo") ?? ""));
  const d = codigo ? await emparejarDispositivo(codigo, VERSION_APP) : null;
  if (!d) {
    return {
      tipo: "error",
      n,
      texto: "El código no existe o venció. Pide uno nuevo en el ERP.",
    };
  }
  (await cookies()).set(COOKIE_DISPOSITIVO, d.token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  redirect(`/terreno/emparejar?listo=${encodeURIComponent(d.identificador)}`);
}
