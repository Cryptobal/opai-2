import type { PanelSueldo } from "@opai/capabilities";
import { cargarPanelSueldo } from "@/lib/panel-sueldo";
import { Plus } from "lucide-react";
import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarInstalacion, cargarInstalaciones } from "./datos";
import { DetalleInstalacion } from "./detalle-instalacion";
import { conFiltrosInstalaciones } from "./filtros-instalaciones";
import type { TabInstalacion } from "./ficha-instalacion";
import { ListaInstalaciones } from "./lista-instalaciones";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabInstalacion;
  /** Acción principal de la pestaña; por defecto, "Nueva instalación". */
  acciones?: ReactNode;
  children: (i: InstalacionDetalle, p: Parametros, panel?: PanelSueldo) => ReactNode;
};

/** Toda pestaña de una instalación (06-08): la lista a la izquierda y la ficha a la derecha; en teléfono, el detalle con "Atrás". */
export function PaginaInstalacion({ params, searchParams, tab, acciones, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Instalaciones"
      ruta="/instalaciones"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      acciones={
        acciones ?? (
          <EnlaceBoton href="/instalaciones/nueva" icono={Plus}>
            Nueva instalación
          </EnlaceBoton>
        )
      }
      cargar={async () => {
        const [{ id }, p, voc] = await Promise.all([
          params,
          leerParametros(searchParams),
          vocabularioActual(),
        ]);
        // Solo la lista se espera aquí: la ficha arranca en paralelo y se espera dentro de su propio Suspense.
        const panel = tab === "sueldo" ? await cargarPanelSueldo("instalacion", id, p) : undefined;
        const datos = panel
          ? Promise.resolve({ state: "ready" as const, instalacion: panel.instalacion })
          : cargarInstalacion(id);
        datos.catch(() => undefined); // si la lista falla, la promesa no queda sin manejar
        return {
          id,
          p,
          datos,
          panel,
          lista: panel
            ? {
                state: "ready" as const,
                items: panel.instalaciones.items,
                cuentas: panel.cuentas.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
              }
            : await cargarInstalaciones(p),
          voc,
        };
      }}
      opciones={(d) => ({
        titulo: d.voc.titulo("instalacion"),
        volver: {
          href: conFiltrosInstalaciones("/instalaciones", d.p),
          etiqueta: d.voc.titulo("instalacion"),
        },
      })}
    >
      {({ id, p, datos, lista, voc, panel }) => (
        <>
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista={`Lista de ${voc.titulo("instalacion").toLowerCase()}`}
            lista={
              <ListaInstalaciones
                state={lista.state}
                items={lista.items}
                cuentas={lista.cuentas}
                titulo={voc.titulo("instalacion")}
                singular={voc.instalacion.singular}
                seleccionada={id}
                parametros={p}
              />
            }
            detalle={
              <Suspense fallback={<Loading variante="detalle" />}>
                <DetalleInstalacion
                  panel={panel}
                  datos={datos}
                  p={p}
                  tab={tab}
                  persona={voc.titulo("persona")}
                >
                  {(i, q) => children(i, q, panel)}
                </DetalleInstalacion>
              </Suspense>
            }
          />
        </>
      )}
    </PaginaPortal>
  );
}
