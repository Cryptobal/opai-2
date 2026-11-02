import type { LucideIcon } from "lucide-react";
import type { ItemMenu } from "@opai/ds";
import { cambiarTenant } from "@/app/_acciones/capacidad";
import { trasLimpiarCaches } from "./limpiar-cache-diferido";

export function empresasShell(empresas: { id: string; nombre: string; actual: boolean }[], icono: LucideIcon): ItemMenu[] {
  return empresas.length > 1 ? empresas.map((e, i) => ({
    id: `t-${e.id}`, ...(i === 0 ? { grupo: "Cambiar de empresa" } : {}),
    etiqueta: e.nombre, icono, marcado: e.actual,
    onSelect: () => trasLimpiarCaches(() => cambiarTenant(e.id)),
  })) : [];
}
