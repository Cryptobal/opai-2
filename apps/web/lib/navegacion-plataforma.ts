import type { ItemNav } from "./navegacion";

/** Menú del portal Plataforma (equipo OPAI). Facturación: cobro por módulo (CAR-188, ADR-071). */
export const NAV_PLATAFORMA: ItemNav[] = [
  // «Empresas» cubre el índice (`/platform`) y el detalle de un tenant (`/platform/tenants/:id`),
  // pero no las demás secciones (`exacta` evita marcarlo en Trabajos, Consumos y Ajustes) (H5).
  {
    href: "/platform",
    etiqueta: "Empresas",
    icono: "Building2",
    exacta: true,
    activoEn: "/platform/tenants",
  },
  { href: "/platform/facturacion", etiqueta: "Facturación", icono: "ReceiptText" },
  { href: "/platform/trabajos", etiqueta: "Trabajos", icono: "Clock" },
  { href: "/platform/indicadores", etiqueta: "Valores legales", icono: "FileText" },
  { href: "/platform/consumos", etiqueta: "Consumos", icono: "Gauge" },
  { href: "/platform/ajustes", etiqueta: "Ajustes", icono: "SlidersHorizontal", pie: true },
];
