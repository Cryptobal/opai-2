import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarInstalacion, cargarInstalaciones } from "./datos";
import { HojaInstalacion } from "./diferidas";
import { FichaInstalacion, type TabInstalacion } from "./ficha-instalacion";
import { ListaInstalaciones } from "./lista-instalaciones";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabInstalacion;
  /** Acción principal de la pestaña; por defecto, "Nueva instalación". */
  acciones?: ReactNode;
  children: (i: InstalacionDetalle, p: Parametros) => ReactNode;
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
        const [lista, ficha] = await Promise.all([cargarInstalaciones(p), cargarInstalacion(id)]);
        return { id, p, lista, ficha, voc };
      }}
      opciones={(d) => ({
        titulo: d.voc.titulo("instalacion"),
        volver: { href: "/instalaciones", etiqueta: d.voc.titulo("instalacion") },
      })}
    >
      {({ id, p, lista, ficha, voc }) => (
        <>
          <SplitScreen
            telefono="detalle"
            etiquetaLista={`Lista de ${voc.titulo("instalacion").toLowerCase()}`}
            lista={
              <ListaInstalaciones
                state={lista.state}
                items={lista.items}
                cuentas={lista.cuentas}
                titulo={voc.titulo("instalacion")}
                singular={voc.instalacion.singular}
                seleccionada={id}
              />
            }
            detalle={
              <FichaInstalacion
                state={ficha.state}
                instalacion={ficha.instalacion}
                tab={tab}
                persona={voc.titulo("persona")}
              >
                {ficha.instalacion ? children(ficha.instalacion, p) : null}
              </FichaInstalacion>
            }
          />
          {ficha.instalacion ? <HojaInstalacion instalacion={ficha.instalacion} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
