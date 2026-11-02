import { Alerta, Badge, DetailScreen, SeccionTarjeta } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarCargo, CLASES } from "../_componentes/datos";
import { Versiones } from "../_componentes/estructura-cargo";
import { SeccionMontosPorInstalacion } from "../_componentes/seccion-montos-instalacion";
import { HojaCargo, SwitchSensible } from "../_componentes/diferidas";

export const metadata = { title: "Cargo" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Cargo: catálogo editable e historial archivado en solo lectura. */
export default function CargoDetalle({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cargo"
      ruta="/cargos"
      cargando="detalle"
      volver={{ href: "/cargos", etiqueta: "Cargos" }}
      cargar={async () => {
        const identidad = await requerirIdentidad("/cargos");
        return {
          ...(await cargarCargo((await params).id)),
          puedeGestionar: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasManage),
          puedeVerSensible: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasReadSensible),
        };
      }}
      opciones={(d) => ({
        titulo: d.cargo?.nombre ?? "Cargo",
      })}
    >
      {({ state, cargo: c, versiones, puedeGestionar, puedeVerSensible }) => {
        return (
          <DetailScreen
            state={c ? state : state === "ready" ? "error" : state}
            titulo={c?.nombre ?? "Cargo"}
            {...(c
              ? {
                  estado: (
                    <Badge tono={c.activo ? "success" : "neutro"}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  ),
                  subtitulo: `${CLASES.find((x) => x.valor === c.clase)?.etiqueta ?? c.clase} · ${c.personasVigentes} personas · ${c.puestosActivos} puestos`,
                  // Sin permiso de gestión el menú queda vacío y solo ofrece «Fijar» bajo 1024 px (CAR-65).
                  acciones: (
                    <AccionesEntidad
                      etiqueta="Acciones del cargo"
                      acciones={
                        !puedeGestionar
                          ? []
                          : [
                              {
                                id: "editar",
                                etiqueta: "Editar",
                                parametro: { clave: "editar", valor: "1" },
                              },
                              {
                                id: "activo",
                                etiqueta: c.activo ? "Desactivar" : "Activar",
                                ...(c.activo ? { peligro: true } : {}),
                                capacidad: {
                                  id: "core.cargos.set_activo",
                                  input: { id: c.id, activo: !c.activo },
                                  exito: c.activo ? "Cargo desactivado" : "Cargo activado",
                                },
                              },
                            ]
                      }
                    />
                  ),
                }
              : {})}
          >
            {c ? (
              <div className="grid gap-4 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-start">
                <div className="flex flex-col gap-4">
                  <SeccionTarjeta titulo="Privacidad">
                    <SwitchSensible
                      id={c.id}
                      activo={c.sueldoSensible}
                      puedeGestionar={puedeGestionar && puedeVerSensible}
                    />
                  </SeccionTarjeta>
                  <Alerta
                    tono="neutral"
                    titulo="Las estructuras antiguas de cargo están retiradas y son de solo lectura."
                  />
                </div>
                  <Versiones versiones={versiones} />
                  <SeccionMontosPorInstalacion cargoId={c.id} />
                {puedeGestionar ? (
                  <>
                    <HojaCargo cargo={c} puedeVerSensible={puedeVerSensible} />
                  </>
                ) : null}
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
