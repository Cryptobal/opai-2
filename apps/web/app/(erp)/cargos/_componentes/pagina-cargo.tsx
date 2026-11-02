import { Plus } from "lucide-react";
import { Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarCargo, cargarCargosLista } from "./datos";
import { DetalleCargo } from "./detalle-cargo";
import { HojaCargo } from "./diferidas";
import { ListaCargos } from "./lista-cargos";

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Ficha de cargo (14): lista a la izquierda y detalle a la derecha; en teléfono, el detalle con «Atrás». */
export function PaginaCargo({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cargos"
      ruta="/cargos"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      acciones={
        <EnlaceBoton href="/cargos?nuevo=1" icono={Plus} className="max-lg:hidden">
          Nuevo cargo
        </EnlaceBoton>
      }
      cargar={async () => {
        const [{ id }, p, identidad] = await Promise.all([
          params,
          leerParametros(searchParams),
          requerirIdentidad("/cargos"),
        ]);
        const datos = cargarCargo(id);
        datos.catch(() => undefined);
        return {
          id,
          p,
          datos,
          lista: await cargarCargosLista(p),
          puedeGestionar: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasManage),
          puedeVerSensible: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasReadSensible),
        };
      }}
      opciones={(d) => ({
        volver: { href: conBusqueda("/cargos", d.p.q), etiqueta: "Cargos" },
      })}
    >
      {({ id, p, datos, lista, puedeGestionar, puedeVerSensible }) => (
        <>
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista="Lista de cargos"
            lista={
              <ListaCargos
                state={lista.state}
                items={lista.items}
                seleccionada={id}
                {...(p.q ? { q: p.q } : {})}
                puedeGestionar={puedeGestionar}
              />
            }
            detalle={
              <Suspense fallback={<Loading variante="detalle" />}>
                <DetalleCargo
                  datos={datos}
                  puedeGestionar={puedeGestionar}
                  puedeVerSensible={puedeVerSensible}
                />
              </Suspense>
            }
          />
          {puedeGestionar ? <HojaCargo puedeVerSensible={puedeVerSensible} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
