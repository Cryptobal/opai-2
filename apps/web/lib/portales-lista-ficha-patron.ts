import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Pantalla lista/ficha de un portal que debe usar ListScreen o DetailScreen (CAR-545, CAR-589). */
export type PantallaPortalPatron = {
  portal: "supervisor" | "cliente" | "trabajador" | "terreno" | "erp";
  ruta: string;
  tipo: "lista" | "ficha";
  /** Componente dueño (relativo a la raíz del repo). */
  archivo: string;
  patron: "ListScreen" | "DetailScreen";
  /** Si true, el gate no exige el patrón aún (PR portal pendiente). */
  pendiente?: boolean;
};

/**
 * Fuente compartida con `docs/2.0/inventario-portales-lista-ficha.md`.
 * Quitar `pendiente` al integrar el PR del portal correspondiente.
 */
const PANTALLAS_PORTAL_PATRON: readonly PantallaPortalPatron[] = [
  {
    portal: "supervisor",
    ruta: "/supervisor/rendiciones",
    tipo: "lista",
    archivo: "apps/web/app/_components/rendiciones/lista.tsx",
    patron: "ListScreen",
  },
  {
    portal: "supervisor",
    ruta: "/supervisor/rendiciones/[id]",
    tipo: "ficha",
    archivo: "apps/web/app/_components/rendiciones/pagina-detalle.tsx",
    patron: "DetailScreen",
  },
  {
    portal: "erp",
    ruta: "/rendiciones",
    tipo: "lista",
    archivo: "apps/web/app/_components/rendiciones/lista.tsx",
    patron: "ListScreen",
  },
  {
    portal: "erp",
    ruta: "/rendiciones/[id]",
    tipo: "ficha",
    archivo: "apps/web/app/_components/rendiciones/pagina-detalle.tsx",
    patron: "DetailScreen",
  },
  {
    portal: "cliente",
    ruta: "/cliente/cotizaciones",
    tipo: "lista",
    archivo: "apps/web/app/(cliente)/cliente/cotizaciones/_componentes/lista-cotizaciones.tsx",
    patron: "ListScreen",
  },
  {
    portal: "cliente",
    ruta: "/cliente/cotizaciones/[id]",
    tipo: "ficha",
    archivo: "apps/web/app/(cliente)/cliente/cotizaciones/_componentes/detalle-cotizacion.tsx",
    patron: "DetailScreen",
  },
  {
    portal: "terreno",
    ruta: "/terreno/rondas",
    tipo: "lista",
    archivo: "apps/web/app/(terreno)/terreno/rondas/lista-plantillas.tsx",
    patron: "ListScreen",
  },
  {
    portal: "supervisor",
    ruta: "/supervisor/instalaciones",
    tipo: "lista",
    archivo: "apps/web/app/(supervisor)/supervisor/instalaciones/page.tsx",
    patron: "ListScreen",
    pendiente: true,
  },
  {
    portal: "supervisor",
    ruta: "/supervisor/instalaciones/[id]",
    tipo: "ficha",
    archivo: "apps/web/app/(supervisor)/supervisor/instalaciones/[id]/page.tsx",
    patron: "DetailScreen",
    pendiente: true,
  },
  {
    portal: "trabajador",
    ruta: "/trabajador/mis-documentos",
    tipo: "lista",
    archivo: "apps/web/app/(trabajador)/trabajador/mis-documentos/_componentes/lista-documentos.tsx",
    patron: "ListScreen",
  },
  {
    portal: "supervisor",
    ruta: "/supervisor/personas/[id]",
    tipo: "ficha",
    archivo: "apps/web/app/(supervisor)/supervisor/personas/[id]/page.tsx",
    patron: "DetailScreen",
    pendiente: true,
  },
];

const raiz = join(import.meta.dirname, "../../..");

export function pantallasPortalSinPatron(): { pantalla: PantallaPortalPatron; motivo: string }[] {
  const fuera: { pantalla: PantallaPortalPatron; motivo: string }[] = [];
  for (const p of PANTALLAS_PORTAL_PATRON) {
    if (p.pendiente) continue;
    const ruta = join(raiz, p.archivo);
    let src: string;
    try {
      src = readFileSync(ruta, "utf8");
    } catch {
      fuera.push({ pantalla: p, motivo: `no existe ${p.archivo}` });
      continue;
    }
    if (!src.includes(p.patron)) {
      fuera.push({ pantalla: p, motivo: `falta ${p.patron} en ${p.archivo}` });
    }
  }
  return fuera;
}