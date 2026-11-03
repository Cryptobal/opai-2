import { Alerta, Badge, DetailScreen, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";

import type { cargarCargo } from "./datos";
import { CLASES } from "./datos";
import { Versiones } from "./estructura-cargo";
import { HojaCargo, SwitchSensible } from "./diferidas";
import { SeccionMontosPorInstalacion } from "./seccion-montos-instalacion";
import { NotaRetiroCargo } from "./nota-retiro-cargo";
import { SeccionMontosPorInstalacion } from "./seccion-montos-instalacion";

type Props = {
  datos: ReturnType<typeof cargarCargo>;
  puedeGestionar: boolean;
  puedeVerSensible: boolean;
};

/** Panel derecho de un cargo: catálogo, privacidad e historial archivado. */
export async function DetalleCargo({ datos, puedeGestionar, puedeVerSensible }: Props) {
  const { state, cargo: c, versiones } = await datos;
  return (
    <DetailScreen
      state={c ? state : state === "ready" ? "error" : state}
      titulo={c?.nombre ?? "Cargo"}
      {...(c
        ? {
            estado: (
              <Badge tono={c.activo ? "success" : "neutro"}>{c.activo ? "Activo" : "Inactivo"}</Badge>
            ),
            subtitulo: `${CLASES.find((x) => x.valor === c.clase)?.etiqueta ?? c.clase} · ${c.personasVigentes} personas · ${c.puestosActivos} puestos`,
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
        <div className="flex flex-col gap-4">
          <NotaRetiroCargo />
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
          </div>
          <SeccionMontosPorInstalacion cargoId={c.id} />
          {puedeGestionar ? <HojaCargo cargo={c} puedeVerSensible={puedeVerSensible} /> : null}
        </div>
      ) : null}
    </DetailScreen>
  );
}
