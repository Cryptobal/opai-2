import type { ReactNode } from "react";
import type { Portal } from "@opai/ds";
import type { GrupoArea } from "@/lib/navegacion-areas";
import type { AccionCmdK } from "@/lib/navegacion-entradas";
import type { ItemNav } from "@/lib/navegacion";

export type DatosShell = {
  portal: string;
  /** Acceso al portal actual en la empresa actual (`datos-shell.ts`). Sin acceso, el shell se monta
   *  igual pero sin búsqueda, ⌘K ni Preferencias; el aviso «Sin permisos» vive en la página. */
  acceso: boolean;
  nav: ItemNav[];
  iconos?: Record<string, ReactNode>;
  /** Solo el ERP (Brief 05): grupos por área (acordeón, D1) con el área principal del rol ya
   *  resuelta en `navInferior` (sin leer las preferencias del usuario en el servidor, ADR-045). */
  grupos?: GrupoArea[];
  navInferior?: ItemNav[];
  /** Acciones de ⌘K (§7), ya filtradas por permiso y módulo activo. */
  acciones?: AccionCmdK[];
  portales: Portal[];
  tenant: { nombre: string } | null;
  usuario: { nombre: string; email: string; rol?: string };
  empresas: { id: string; nombre: string; actual: boolean }[];
  /** Quién y en qué empresa ve la página (`lib/epoca-sesion.ts`); las pestañas la comparan. */
  epoca: string;
};
