import type { PanelSueldo } from "@opai/capabilities";
import { cargarPanelSueldo } from "@/lib/panel-sueldo";
import { Pencil } from "lucide-react";
import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import type { PersonaDetalle } from "@/lib/tipos-maestros";
import { hoyIso } from "@/lib/fechas";

import { cargarPersona, cargarPersonas } from "./datos";
import { DetallePersona } from "./detalle-persona";
import { HojaPersona } from "./diferidas";
import type { TabPersona } from "./ficha-persona";
import { conHoja, conParametros, ListaPersonas } from "./lista-personas";
import { SegmentoPersonas } from "./segmento";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabPersona;
  /** Acción principal de la pestaña; por defecto, "Editar". Puede depender de los parámetros de la lista. */
  acciones?: ReactNode | ((p: Parametros) => ReactNode);
  children: (
    persona: PersonaDetalle,
    p: Parametros,
    panel?: PanelSueldo,
  ) => ReactNode | Promise<ReactNode>;
};

/** Toda pestaña de una persona (11-18): la lista a la izquierda y la ficha a la derecha; en teléfono, el detalle con "Atrás". */
export function PaginaPersona({ params, searchParams, tab, acciones, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Personas"
      ruta="/personas"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      opciones={(d) => ({
        titulo: "Personas",
        volver: { href: `/personas${conParametros(d.p)}`, etiqueta: "Personas" },
        // Bajo 1024 px la ficha ocupa todo el ancho y la barra no tiene sitio para las dos secciones.
        insignia: (
          <div className="hidden lg:block">
            <SegmentoPersonas activa="personas" plural="Personas" />
          </div>
        ),
        acciones: (typeof acciones === "function" ? acciones(d.p) : acciones) ?? (
          <EnlaceBotonHoja href={conHoja("editar=1", d.p)} icono={Pencil}>
            Editar
          </EnlaceBotonHoja>
        ),
      })}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, leerParametros(searchParams)]);
        // Solo la lista se espera aquí: la ficha arranca en paralelo y se espera dentro de su propio Suspense.
        const panel = tab === "sueldo" ? await cargarPanelSueldo("persona", id, p) : undefined;
        const datos = panel
          ? Promise.resolve({ state: "ready" as const, persona: panel.persona })
          : cargarPersona(id);
        datos.catch(() => undefined); // si la lista falla, la promesa no queda sin manejar
        return {
          id,
          p,
          datos,
          panel,
          lista: panel
            ? {
                state: "ready" as const,
                items: panel.personas.items,
                siguiente: panel.personas.siguiente,
                total: panel.personas.total,
                cargos: (panel.personas.cargos ?? []).map((c) => ({
                  valor: c.id,
                  etiqueta: c.nombre,
                })),
              }
            : await cargarPersonas(p),
        };
      }}
    >
      {(d) => (
        <>
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista="Lista de personas"
            lista={
              <ListaPersonas
                state={d.lista.state}
                items={d.lista.items}
                cargos={d.lista.cargos}
                siguiente={d.lista.siguiente}
                total={d.lista.total}
                p={d.p}
                titulo="Personas"
                seleccionada={d.id}
              />
            }
            detalle={
              <Suspense fallback={<Loading variante="detalle" />}>
                <DetallePersona panel={d.panel} datos={d.datos} p={d.p} tab={tab}>
                  {(p, q) => children(p, q, d.panel)}
                </DetallePersona>
              </Suspense>
            }
          />
          <HojaPersona cargos={d.lista.cargos} hoy={hoyIso()} />
        </>
      )}
    </PaginaPortal>
  );
}
