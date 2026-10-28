import { Plus } from "lucide-react";

import { Cabecera, Empty, Estado, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos } from "@/lib/fechas";

import type { NegocioFila } from "../datos";
import { VistaNegocios } from "../vista-negocios";
import { ArrastreTablero } from "./arrastre-tablero";
import { ColumnaEtapa } from "./columna-etapa";
import { SelectorEtapa } from "./selector-etapa";

type Etapa = { id: string; nombre: string; tipo: string; probabilidad: number };

export const accionNuevo = (
  <EnlaceBoton href="/negocios?nuevo=1" icono={Plus}>
    Nuevo negocio
  </EnlaceBoton>
);

/**
 * Tablero de Negocios (export «Negocios · Tablero»): una columna por etapa activa con su contador y
 * suma mensual; scroll horizontal, cada columna con su scroll y cabecera fija. En el teléfono, una
 * columna a la vez con el selector de etapa. Arrastre nativo y «Mover a…» en cada tarjeta.
 */
export function TableroNegocios(p: {
  state: EstadoPantalla;
  etapas: Etapa[];
  negocios: NegocioFila[];
  /** Con `comercial:negocios.manage`: «Nuevo negocio», arrastre y «Mover a…». */
  gestiona: boolean;
  /** Etapa elegida (`?etapa=`): el teléfono vuelve a esa columna al cargar. */
  etapa?: string | undefined;
}) {
  const abiertos = p.negocios.filter((n) => n.estado === "abierto");
  const enCurso = abiertos.reduce((a, n) => a + (n.valorMensual ?? n.montoEstimadoMensual ?? 0), 0);
  const de = (id: string) => p.negocios.filter((n) => n.etapaId === id);
  const etapas = p.etapas.map((e) => ({ id: e.id, nombre: e.nombre, tipo: e.tipo }));
  return (
    <section className="flex min-w-0 flex-col" aria-label="Tablero de negocios">
      <Cabecera
        titulo="Negocios"
        subtitulo={`${abiertos.length} ${abiertos.length === 1 ? "abierto" : "abiertos"} · ${pesos(enCurso)} mensuales en curso`}
        {...(p.gestiona ? { acciones: accionNuevo } : {})}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <VistaNegocios activa="tablero" />
        <SelectorEtapa
          etapas={p.etapas.map((e) => ({ id: e.id, nombre: e.nombre, n: de(e.id).length }))}
          inicial={p.etapa}
        />
      </div>
      <Estado state={p.state} variante="lista">
        {p.etapas.length ? (
          <ArrastreTablero etapas={etapas}>
            <div
              id="columnas-tablero"
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0"
            >
              {p.etapas.map((e) => (
                <ColumnaEtapa
                  key={e.id}
                  etapa={e}
                  negocios={de(e.id)}
                  etapas={p.gestiona ? etapas : null}
                />
              ))}
            </div>
          </ArrastreTablero>
        ) : (
          <Empty
            titulo="El embudo no tiene etapas"
            descripcion="Agrégalas en Configuración → Módulos → Comercial."
          />
        )}
      </Estado>
    </section>
  );
}
