import { Plus } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarInstalacion, cargarInstalaciones } from "../_componentes/datos";
import { FichaInstalacion } from "../_componentes/ficha-instalacion";
import { HojaInstalacion } from "../_componentes/hoja-instalacion";
import { ListaInstalaciones } from "../_componentes/lista-instalaciones";
import { ResumenInstalacion } from "../_componentes/resumen-instalacion";

export const metadata = { title: "Instalación" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Instalación · Resumen en la vista dividida (07); en teléfono, el detalle con "Atrás" (08). */
export default function Instalacion({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Instalaciones"
      ruta="/instalaciones"
      completo
      cargando="detalle"
      volverSoloTelefono
      acciones={
        <EnlaceBoton href="/instalaciones/nueva" icono={Plus}>
          Nueva instalación
        </EnlaceBoton>
      }
      cargar={async () => {
        const [{ id }, p, voc] = await Promise.all([
          params,
          leerParametros(searchParams),
          vocabularioActual(),
        ]);
        const [lista, ficha] = await Promise.all([cargarInstalaciones(p), cargarInstalacion(id)]);
        return { id, lista, ficha, voc };
      }}
      opciones={(d) => ({
        titulo: d.voc.titulo("instalacion"),
        volver: { href: "/instalaciones", etiqueta: d.voc.titulo("instalacion") },
      })}
    >
      {({ id, lista, ficha, voc }) => (
        <>
          <SplitScreen
            telefono="detalle"
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
                tab="resumen"
                persona={voc.titulo("persona")}
              >
                {ficha.instalacion ? <ResumenInstalacion i={ficha.instalacion} /> : null}
              </FichaInstalacion>
            }
          />
          {ficha.instalacion ? <HojaInstalacion instalacion={ficha.instalacion} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
