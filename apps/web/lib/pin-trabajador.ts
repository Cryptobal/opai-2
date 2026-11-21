import { redirect } from "next/navigation";

import { ejecutarComoUsuario } from "@/lib/servidor";

type MiPin = { tienePin: boolean; debeCambiar: boolean };

const RUTAS_SIN_PIN = ["/trabajador/crear-pin", "/trabajador/cambiar-pin"];

/** Redirige a crear o cambiar PIN si falta (CAR-803). */
export async function obligarPinTrabajador(ruta: string) {
  if (RUTAS_SIN_PIN.some((p) => ruta === p || ruta.startsWith(`${p}?`))) return;
  const r = await ejecutarComoUsuario<MiPin>("trabajador", "core.credenciales_terreno.mi_estado", {});
  if (!r.ok) return;
  if (!r.data.tienePin) redirect("/trabajador/crear-pin");
  if (r.data.debeCambiar) redirect("/trabajador/cambiar-pin?primero=1");
}