import type { Portal } from "@opai/ds";

/** Portales de OPAI 2.0. Cada uno tiene su route group; el acceso es por membresía (ADR-016). */
export const PORTALES: readonly Portal[] = [
  { id: "erp", etiqueta: "ERP", corta: "ERP", href: "/" },
  { id: "supervisor", etiqueta: "Supervisor", corta: "Superv.", href: "/supervisor" },
  { id: "trabajador", etiqueta: "Trabajador", corta: "Trabaj.", href: "/trabajador" },
  { id: "terreno", etiqueta: "Terreno", corta: "Terreno", href: "/terreno" },
  { id: "cliente", etiqueta: "Cliente", corta: "Cliente", href: "/cliente" },
  { id: "platform", etiqueta: "Plataforma", corta: "Plataf.", href: "/platform" },
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

/** Nombre del portal para el título de la pestaña: «Portal Trabajador», «Plataforma» (el ERP no lleva). */
function nombreParaTitulo(portal: string): string | undefined {
  const etiqueta = PORTALES.find((x) => x.id === portal)?.etiqueta;
  if (portal === "erp" || !etiqueta) return undefined;
  return portal === "platform" ? etiqueta : `Portal ${etiqueta}`;
}

/** Título de pestaña de una página de portal: «Inicio · Portal Trabajador» (el ERP: solo la página). */
export function tituloPagina(portal: string, pagina: string): string {
  const nombre = nombreParaTitulo(portal);
  return nombre ? `${pagina} · ${nombre}` : pagina;
}

/** Título del 404 de un portal: nombra el portal para no confundir «No encontrado» entre portales. */
export function tituloNoEncontrado(portal: string): string {
  return tituloPagina(portal, "No encontrado");
}

/** Subtítulo de la marca en el lateral: el nombre del portal (el ERP no lleva subtítulo). */
export function subtituloMarcaPortal(portal: string): string | undefined {
  return portal === "erp" ? undefined : PORTALES.find((x) => x.id === portal)?.etiqueta;
}
