import { Plus } from "lucide-react";

import { AccionFijaTelefono, Badge, DetailScreen, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";

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
      acciones={
        <EnlaceBotonHoja href="?version=1" icono={Plus}>
          Crear versión
        </EnlaceBotonHoja>
      }
      cargar={async () => cargarCargo((await params).id)}
      opciones={(d) => ({ titulo: d.cargo?.nombre ?? "Cargo" })}
    >
      {({ state, cargo: c, versiones }) => {
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
                  acciones: (
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
                  ),
                }
              : {})}
          >
            {c ? (
              <div className="grid gap-4 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-start">
                <div className="flex flex-col gap-4">
                  <SeccionTarjeta titulo="Privacidad">
                    <SwitchSensible id={c.id} activo={c.sueldoSensible} />
                  </SeccionTarjeta>
                  <EstructuraBase e={vigente} />
                </div>
                <Versiones versiones={versiones} />
                <AccionFijaTelefono>
                  <EnlaceBotonHoja href="?version=1">Crear versión</EnlaceBotonHoja>
                </AccionFijaTelefono>
                <HojaCargo cargo={c} />
                <HojaVersion cargoId={c.id} base={vigente ?? versiones[0]} hoy={hoy} />
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
