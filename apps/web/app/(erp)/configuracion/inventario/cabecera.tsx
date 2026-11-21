import { Plus } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { construirPuede } from "@/lib/permisos-ui";
import type { Indice } from "../_centro/datos";

import type { CategoriaConfig, PrendaConfig, TabInventarioConfig } from "./tipos";

const PERMISO_TIPOS = "inventario:tipos.manage";

type Datos = {
  tab: TabInventarioConfig;
  prendas: { ok: boolean; data?: { items: PrendaConfig[] } };
  categorias: { ok: boolean; data?: { items: CategoriaConfig[] } };
};

export function cabeceraInventarioConfig({ tab, prendas, categorias }: Datos, indice: Indice) {
  const vacio =
    tab === "prendas"
      ? !!(prendas.ok && prendas.data && prendas.data.items.length === 0)
      : !!(categorias.ok && categorias.data && categorias.data.items.length === 0);
  const puede = construirPuede(indice.rol, indice.acceso)(PERMISO_TIPOS);
  return {
    subtitulo: "Prendas del uniforme y categorías de tipos",
    acciones:
      puede && !vacio ? (
        <EnlaceBotonHoja href={`?tab=${tab}&nuevo=1`} icono={Plus}>
          {tab === "prendas" ? "Nueva prenda" : "Nueva categoría"}
        </EnlaceBotonHoja>
      ) : undefined,
  };
}