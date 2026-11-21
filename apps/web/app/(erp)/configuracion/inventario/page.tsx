import { Plus } from "lucide-react";

import { Empty, Estado, Segmentado } from "@opai/ds";
const PERMISO_TIPOS = "inventario:tipos.manage";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { HojaCategoria, HojaPrenda } from "./diferidas";
import { ListaCategorias } from "./lista-categorias";
import { ListaPrendas } from "./lista-prendas";
import type { CategoriaConfig, PrendaConfig, TabInventarioConfig } from "./tipos";

export const metadata = { title: "Inventario" };

/** Configuración › Inventario (CAR-743): prendas del uniforme y categorías de tipos. */
export default function ConfigInventario({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="inventario"
      titulo="Inventario"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const tab: TabInventarioConfig = p["tab"] === "categorias" ? "categorias" : "prendas";
        const [prendas, categorias] = await Promise.all([
          ejecutarComoUsuario<{ items: PrendaConfig[]; heredaRubro: boolean }>(
            "erp",
            "inventario.config.prendas_list",
            {},
          ),
          ejecutarComoUsuario<{ items: CategoriaConfig[] }>("erp", "inventario.config.categorias_list", {}),
        ]);
        return { tab, prendas, categorias, editar: p["editar"], heredaRubro: prendas.ok ? prendas.data.heredaRubro : false };
      }}
      cabecera={({ tab, prendas, categorias }, indice) => {
        const vacio =
          tab === "prendas"
            ? prendas.ok && prendas.data.items.length === 0
            : categorias.ok && categorias.data.items.length === 0;
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
      }}
    >
      {({ tab, prendas, categorias, editar, heredaRubro }, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISO_TIPOS);
        const r = tab === "prendas" ? prendas : categorias;
        const itemsPrendas = prendas.ok ? prendas.data.items : [];
        const itemsCats = categorias.ok ? categorias.data.items : [];
        return (
          <div className="flex flex-col gap-4">
            <Segmentado
              etiqueta="Catálogo"
              activa={tab}
              Link={LinkNext}
              className="self-start"
              opciones={[
                {
                  id: "prendas",
                  etiqueta: `Prendas${prendas.ok ? ` (${itemsPrendas.length})` : ""}`,
                  href: "?tab=prendas",
                },
                {
                  id: "categorias",
                  etiqueta: `Categorías${categorias.ok ? ` (${itemsCats.length})` : ""}`,
                  href: "?tab=categorias",
                },
              ]}
            />
            {tab === "prendas" && heredaRubro ? (
              <p className="t-caption text-fg-muted">
                Sin lista propia: se usan las prendas de tu rubro. Agrega la primera para personalizar.
              </p>
            ) : null}
            {!r.ok ? (
              <Estado state={estadoPantalla(r)} variante="lista">
                {null}
              </Estado>
            ) : tab === "prendas" && itemsPrendas.length === 0 ? (
              <Empty
                titulo="Sin prendas propias"
                descripcion="Agrega las prendas del uniforme de tu empresa."
                accion={
                  puede ? (
                    <EnlaceBotonHoja href="?tab=prendas&nuevo=1" icono={Plus}>
                      Nueva prenda
                    </EnlaceBotonHoja>
                  ) : undefined
                }
              />
            ) : tab === "categorias" && itemsCats.length === 0 ? (
              <Empty titulo="Sin categorías" descripcion="Usarás Activo y Ropa por defecto." />
            ) : tab === "prendas" ? (
              <ListaPrendas prendas={itemsPrendas} puede={puede} />
            ) : (
              <ListaCategorias categorias={itemsCats} puede={puede} />
            )}
            {puede && tab === "prendas" ? (
              <>
                <HojaPrenda todas={itemsPrendas} />
                {itemsPrendas
                  .filter((p) => p.clave === editar)
                  .map((p) => (
                    <HojaPrenda key={p.clave} todas={itemsPrendas} prenda={p} />
                  ))}
              </>
            ) : null}
            {puede && tab === "categorias" ? (
              <>
                <HojaCategoria todas={itemsCats} />
                {itemsCats
                  .filter((c) => c.clave === editar)
                  .map((c) => (
                    <HojaCategoria key={c.clave} todas={itemsCats} categoria={c} />
                  ))}
              </>
            ) : null}
          </div>
        );
      }}
    </PaginaConfig>
  );
}