import { estadoPantalla } from "@/lib/formato";

/** Un usuario sin persona vinculada no es un fallo: la pantalla lo dice y orienta (Estado vacío). */
export function estadoTrabajador(...rs: { ok: boolean; error?: { code: string } }[]) {
  return rs.some((r) => !r.ok && r.error?.code === "NOT_FOUND")
    ? ("empty" as const)
    : estadoPantalla(...rs);
}

export const SIN_FICHA = {
  titulo: "Tu cuenta aún no tiene una ficha",
  descripcion: "Pídele a Recursos Humanos que vincule tu usuario a tu ficha de persona.",
} as const;
