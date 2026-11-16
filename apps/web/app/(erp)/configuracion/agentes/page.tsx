import { Plus } from "lucide-react";

import { Estado, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { PaginaConfig } from "../_centro/pagina-config";
import { cargarKeys } from "./datos";
import { EnlacesAgentes } from "./enlaces-agentes";
import {
  conteosKeys,
  FILTROS_KEY,
  filtroDesde,
  hrefFiltroKeys,
  keysFiltradas,
  textosVacioKey,
} from "./filtro-keys";
import { HojaCrearKey } from "./hoja-crear";
import { TarjetaKey } from "./tarjeta-key";

export const metadata = { title: "Agentes y API keys" };

/** Agentes y API keys (24): una fila por key con su presupuesto del mes; crear y conectar tu IA. */
export default function Agentes({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="agentes"
      titulo="Agentes y API keys"
      cargar={async () => {
        const [datos, p] = await Promise.all([cargarKeys(), leerParametros(searchParams)]);
        return { ...datos, filtro: filtroDesde(p), params: p };
      }}
      cabecera={() => ({
        acciones: (
          <EnlaceBotonHoja href="?crear=1" icono={Plus}>
            Crear key
          </EnlaceBotonHoja>
        ),
      })}
    >
      {({ state, keys, gasto, scopes, permisos, puedeCrearServicio, filtro, params }) => {
        const conteos = conteosKeys(keys);
        const visibles = keysFiltradas(keys, filtro);
        const vacio = textosVacioKey[filtro];
        return (
          <>
            <div className="mb-4 flex flex-col gap-4">
              <EnlacesAgentes />
              <Segmentado
                etiqueta="Estado de las keys"
                Link={LinkNext}
                activa={filtro}
                opciones={FILTROS_KEY.map((f) => ({
                  id: f.id,
                  etiqueta: `${f.etiquetaBase} (${conteos[f.id]})`,
                  href: hrefFiltroKeys(f.id, params),
                }))}
              />
            </div>
            <Estado
              state={state === "ready" && visibles.length === 0 ? "empty" : state}
              variante="lista"
              textos={{ vacio }}
            >
              <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                {visibles.map((k) => (
                  <TarjetaKey key={k.id} k={k} gasto={gasto.get(k.id) ?? 0} />
                ))}
              </ul>
            </Estado>
            <HojaCrearKey scopes={scopes} permisos={permisos} puedeCrearServicio={puedeCrearServicio} />
          </>
        );
      }}
    </PaginaConfig>
  );
}