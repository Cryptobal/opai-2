"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ejecutarComoUsuario } from "@/lib/servidor";

/** Mi cuenta › Apps conectadas (CAR-247): desconecta por la capacidad `core.apps_conectadas.desconectar`. */
export type ResultadoDesconectar = { ok: true } | { ok: false; error: string };

export async function accionDesconectarApp(clientId: string): Promise<ResultadoDesconectar> {
  const id = z.string().min(1).max(200).safeParse(clientId);
  if (!id.success) return { ok: false, error: "App no válida." };
  const r = await ejecutarComoUsuario("erp", "core.apps_conectadas.desconectar", {
    clientId: id.data,
  });
  if (!r.ok) return { ok: false, error: r.error.message };
  revalidatePath("/mi-cuenta");
  return { ok: true };
}
