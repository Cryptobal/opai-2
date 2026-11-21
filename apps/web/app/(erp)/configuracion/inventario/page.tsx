import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { cabeceraInventarioConfig } from "./cabecera";
import { ContenidoConfigInventario } from "./contenido";
import type { CategoriaConfig, PrendaConfig, TabInventarioConfig } from "./tipos";

export const metadata = { title: "Inventario" };

async function cargarInventarioConfig(searchParams: SearchParams) {
  const p = await leerParametros(searchParams);
  const tab: TabInventarioConfig = p["tab"] === "categorias" ? "categorias" : "prendas";
  const [prendas, categorias] = await Promise.all([
    ejecutarComoUsuario<{ items: PrendaConfig[]; heredaRubro: boolean }>("erp", "inventario.config.prendas_list", {}),
    ejecutarComoUsuario<{ items: CategoriaConfig[] }>("erp", "inventario.config.categorias_list", {}),
  ]);
  return {
    tab,
    prendas,
    categorias,
    editar: p["editar"],
    heredaRubro: prendas.ok ? prendas.data.heredaRubro : false,
  };
}

/** Configuración › Inventario (CAR-743): prendas del uniforme y categorías de tipos. */
export default function ConfigInventario({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="inventario"
      titulo="Inventario"
      cargar={() => cargarInventarioConfig(searchParams)}
      cabecera={cabeceraInventarioConfig}
    >
      {(datos, indice) => <ContenidoConfigInventario {...datos} indice={indice} />}
    </PaginaConfig>
  );
}