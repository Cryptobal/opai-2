import { estadoPantalla } from "@/lib/formato";

/** Estados vacíos del portal trabajador: sin ficha, módulo apagado o sin acceso al portal. */
export function estadoTrabajador(...rs: { ok: boolean; error?: { code: string; message?: string } }[]) {
  if (rs.some((r) => !r.ok && r.error?.code === "NOT_FOUND")) return "empty" as const;
  if (rs.some((r) => !r.ok && r.error?.message?.includes('Módulo inactivo: "portal_trabajador"')))
    return "empty" as const;
  return estadoPantalla(...rs);
}

export const SIN_FICHA = {
  titulo: "Tu cuenta aún no tiene una ficha",
  descripcion: "Pídele a Recursos Humanos que vincule tu usuario a tu ficha de persona.",
} as const;

export const MODULO_INACTIVO = {
  titulo: "Portal no disponible en tu empresa",
  descripcion:
    "Tu empresa aún no tiene contratado el Portal Trabajador. Si crees que deberías tener acceso, habla con Recursos Humanos.",
} as const;

export function textosEstadoTrabajador(moduloActivo = true) {
  return { vacio: moduloActivo ? SIN_FICHA : MODULO_INACTIVO };
}
