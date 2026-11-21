"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSession } from "@opai/auth";
import { PORTALES_VER_COMO, VER_COMO_MINUTOS } from "@opai/domain";

import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { verComoDe } from "@/lib/ver-como";
import { COOKIE_VER_COMO, firmarVerComo, type VerComo } from "@/lib/ver-como-token";

/** «Ver como» (CAR-528): inicia por `core.ver_como.iniciar` y termina por `core.ver_como.terminar`. */
export type ResultadoVerComo = { ok: false; error: string };

const entrada = z.object({ portal: z.enum(PORTALES_VER_COMO), objetivoId: z.uuid() });
type Vista = Pick<
  VerComo,
  "portal" | "objetivoId" | "nombre" | "userId" | "personaId" | "dispositivoId"
> & {
  expiraEn: string;
};

export async function accionIniciarVerComo(
  portal: string,
  objetivoId: string,
): Promise<ResultadoVerComo | undefined> {
  const e = entrada.safeParse({ portal, objetivoId });
  if (!e.success) return { ok: false, error: "Elige un portal y a quién ver." };
  const [identidad, sesion] = await Promise.all([identidadActual(), getSession()]);
  if (!identidad?.actual || !sesion) return { ok: false, error: "Inicia sesión." };
  const r = await ejecutarComoUsuario<Vista>("erp", "core.ver_como.iniciar", e.data);
  if (!r.ok) return { ok: false, error: r.error.message };
  const { expiraEn, ...vista } = r.data;
  const token = firmarVerComo({
    ...vista,
    tenantId: identidad.actual.tenantId,
    porUserId: identidad.usuario.id,
    sesionId: sesion.session.id,
    expira: Date.parse(expiraEn),
  });
  (await cookies()).set(COOKIE_VER_COMO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VER_COMO_MINUTOS * 60,
  });
  redirect(`/${vista.portal}`);
}

/** Sale de la vista: registra el fin si sigue vigente y borra la cookie igual. */
export async function accionSalirVerComo(): Promise<void> {
  const identidad = await identidadActual();
  const v = identidad ? await verComoDe(identidad) : null;
  if (v)
    await ejecutarComoUsuario("erp", "core.ver_como.terminar", {
      portal: v.portal,
      objetivoId: v.objetivoId,
    });
  (await cookies()).delete(COOKIE_VER_COMO);
  redirect("/");
}
