import { Building2, MapPin, Settings } from "lucide-react";

import type { GrupoPaleta } from "@opai/ds";

const GRUPOS: GrupoPaleta[] = [
  {
    titulo: "Instalaciones",
    items: [
      {
        id: "i1",
        etiqueta: "Planta Quilicura",
        detalle: "Logística Andina SpA",
        icono: MapPin,
        href: "#",
      },
    ],
  },
  {
    titulo: "Cuentas",
    items: [
      {
        id: "c1",
        etiqueta: "Logística Andina SpA",
        detalle: "Av. Las Industrias 4520, Quilicura",
        icono: Building2,
        href: "#",
      },
    ],
  },
  {
    titulo: "Personas",
    items: [
      {
        id: "p1",
        etiqueta: "María Fernanda Soto",
        detalle: "Guardia · Planta Quilicura",
        persona: true,
        href: "#",
      },
      {
        id: "p2",
        etiqueta: "Nicolás González Paz",
        detalle: "Guardia · Planta Quilicura",
        persona: true,
        href: "#",
      },
    ],
  },
  {
    titulo: "Ajustes",
    items: [
      {
        id: "a1",
        etiqueta: "Zona horaria",
        detalle: "Configuración › Datos de la empresa",
        icono: Settings,
        href: "#",
      },
    ],
  },
];

/** Búsqueda ficticia de la paleta en /ds: filtra los ítems por texto. */
export async function buscarMuestra(q: string): Promise<GrupoPaleta[]> {
  const t = q.toLowerCase();
  return GRUPOS.map((g) => ({
    ...g,
    items: g.items.filter((i) => `${i.etiqueta} ${i.detalle ?? ""}`.toLowerCase().includes(t)),
  })).filter((g) => g.items.length > 0);
}
