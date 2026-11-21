import { Plus } from "lucide-react";

import { Empty, Estado, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import type { Resultado } from "@opai/capabilities";

import { estadoPantalla } from "@/lib/formato";
import { construirPuede } from "@/lib/permisos-ui";
import type { Indice } from "../_centro/datos";

import { HojaCategoria, HojaPrenda } from "./diferidas";
import { ListaCategorias } from "./lista-categorias";
import { ListaPrendas } from "./lista-prendas";
import type { CategoriaConfig, PrendaConfig, TabInventarioConfig } from "./tipos";

const PERMISO_TIPOS = "inventario:tipos.manage";

type Props = {
  tab: TabInventarioConfig;
  prendas: Resultado<{ items: PrendaConfig[]; heredaRubro: boolean }>;
  categorias: Resultado<{ items: CategoriaConfig[] }>;
  editar?: string | undefined;
  heredaRubro: boolean;
  indice: Indice;
};

export function ContenidoConfigInventario({ tab, prendas, categorias, editar, heredaRubro, indice }: Props) {
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
}