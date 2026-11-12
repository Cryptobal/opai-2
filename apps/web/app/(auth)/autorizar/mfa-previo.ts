import { redirect } from "next/navigation";

import type { Identidad } from "@/lib/actor";
import { verificarMfaDe } from "@/lib/mfa";

/**
 * Conectar una app exige lo mismo que entrar a un portal: si la cuenta debe tener segundo factor y aún
 * no lo activó (o no lo verificó en esta sesión), primero eso, y después se vuelve aquí (NÚCLEO-F).
 */
export async function exigirSegundoFactor(identidad: Identidad, ruta: string): Promise<void> {
  const pendiente = await verificarMfaDe(identidad);
  if (pendiente)
    redirect(
      `/${pendiente === "enrolar" ? "activar-mfa" : "mfa"}?next=${encodeURIComponent(ruta)}`,
    );
}
