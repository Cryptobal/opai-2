import { FileCheck2, ReceiptText } from "lucide-react";

import { seccion as s, type Seccion } from "./seccion-tipo";

/** Permiso con el que estas pantallas estaban en el menú de Finanzas (manifest de Finanzas). */
const VENTAS_CONFIGURAR = "finanzas:ventas.configure";

/**
 * Ajustes tributarios de Finanzas que salieron del menú (CAR-182): se configuran una vez y no son
 * trabajo diario. Viven en Configuración › Empresa, solo con Finanzas activo; las rutas no cambian.
 * Plan de cuentas ya es una pestaña de Configuración › Módulos › Finanzas.
 */
export const SECCIONES_FINANZAS: readonly Seccion[] = [
  s({
    id: "facturacion-electronica",
    href: "/finanzas/configuracion-dte",
    titulo: "Facturación electrónica",
    descripcion: "Emisor, ambiente del SII y proveedor de DTE",
    corta: "Emisor y proveedor de DTE",
    icono: FileCheck2,
    grupo: "empresa",
    permiso: VENTAS_CONFIGURAR,
    modulo: "finanzas",
  }),
  s({
    id: "folios",
    href: "/finanzas/folios",
    titulo: "Folios",
    descripcion: "Archivos CAF del SII y folios disponibles por tipo de documento",
    corta: "CAF y folios disponibles",
    icono: ReceiptText,
    grupo: "empresa",
    permiso: VENTAS_CONFIGURAR,
    modulo: "finanzas",
  }),
];
