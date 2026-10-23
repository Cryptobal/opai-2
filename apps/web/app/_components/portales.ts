import type { Portal } from "@opai/ds";

/** Portales de OPAI 2.0. Cada uno tiene su route group; el acceso es por membresía (ADR-016). */
export const PORTALES: readonly Portal[] = [
  { id: "erp", etiqueta: "ERP", href: "/" },
  { id: "supervisor", etiqueta: "Supervisor", href: "/supervisor" },
  { id: "trabajador", etiqueta: "Trabajador", href: "/trabajador" },
  { id: "terreno", etiqueta: "Terreno", href: "/terreno" },
  { id: "cliente", etiqueta: "Cliente", href: "/cliente" },
  { id: "platform", etiqueta: "Plataforma", href: "/platform" },
];

export const ETIQUETA_ROL: Record<string, string> = {
  owner: "Owner",
  admin: "Administrador",
  gerente: "Gerente",
  supervisor: "Supervisor",
  viewer: "Solo lectura",
};

/** Portales visibles: los de la membresía actual y Plataforma solo con `platformRole`. */
export function portalesVisibles(
  portalesMembresia: readonly string[],
  plataforma: boolean,
): Portal[] {
  return PORTALES.filter((p) =>
    p.id === "platform" ? plataforma : portalesMembresia.includes(p.id),
  );
}
