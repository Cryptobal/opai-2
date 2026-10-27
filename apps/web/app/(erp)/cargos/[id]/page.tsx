import { Plus } from "lucide-react";

import { AccionFijaTelefono, Alerta, Badge, DetailScreen, SeccionTarjeta } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarCargo, CLASES } from "../_componentes/datos";
import { EstructuraBase, Versiones } from "../_componentes/estructura-cargo";
import { HojaCargo, HojaVersion, SwitchSensible } from "../_componentes/diferidas";

export const metadata = { title: "Cargo" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Cargo (15): sueldo sensible, estructura base vigente y versiones; "Crear versión". */
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
        acciones:
          d.puedeGestionar && (!d.cargo?.sueldoSensible || d.puedeVerSensible) ? (
            <EnlaceBotonHoja href="?version=1" icono={Plus}>
              Crear versión
            </EnlaceBotonHoja>
          ) : null,
      })}
    >
      {({ state, cargo: c, versiones, puedeGestionar, puedeVerSensible }) => {
        const hoy = hoyIso();
        const vigente = versiones.find(
          (v) =>
            v.estado === "vigente" &&
            v.vigenteDesde <= hoy &&
            (!v.vigenteHasta || v.vigenteHasta >= hoy),
        );
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
                  acciones: puedeGestionar ? (
                    <AccionesEntidad
                      etiqueta="Acciones del cargo"
                      acciones={[
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
                      ]}
                    />
                  ) : null,
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
                  {puedeGestionar && c.sueldoSensible && !puedeVerSensible ? (
                    <Alerta
                      tono="neutral"
                      titulo="No puedes crear versiones de este cargo. Sus montos son sensibles. Pide a un owner o admin el permiso para ver sueldos sensibles."
                    />
                  ) : null}
                  <EstructuraBase e={vigente} />
                </div>
                <Versiones versiones={versiones} />
                {puedeGestionar ? (
                  <>
                    {!c.sueldoSensible || puedeVerSensible ? (
                      <AccionFijaTelefono>
                        <EnlaceBotonHoja href="?version=1">Crear versión</EnlaceBotonHoja>
                      </AccionFijaTelefono>
                    ) : null}
                    <HojaCargo cargo={c} puedeVerSensible={puedeVerSensible} />
                    {!c.sueldoSensible || puedeVerSensible ? (
                      <HojaVersion cargoId={c.id} base={vigente ?? versiones[0]} hoy={hoy} />
                    ) : null}
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
