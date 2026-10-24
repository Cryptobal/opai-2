import { Lock, Plus } from "lucide-react";

import { Alerta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { vocabularioActual } from "@/lib/vocabulario";

import { SegmentoPersonas } from "../personas/_componentes/segmento";
import { cargarCargosLista } from "./_componentes/datos";
import { HojaCargo } from "./_componentes/diferidas";
import { ListaCargos } from "./_componentes/lista-cargos";

export const metadata = { title: "Cargos y sueldos" };

/** Cargos y sueldos (14): cada cargo con los montos de su estructura vigente. */
export default function Cargos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cargos y sueldos"
      ruta="/cargos"
      acciones={
        <EnlaceBoton href="?nuevo=1" icono={Plus}>
          Nuevo cargo
        </EnlaceBoton>
      }
      cargar={async () => {
        const [p, voc] = await Promise.all([leerParametros(searchParams), vocabularioActual()]);
        return { ...(await cargarCargosLista(p)), voc };
      }}
      opciones={(d) => ({
        titulo: "Cargos",
        insignia: <SegmentoPersonas activa="cargos" plural="Personas" />,
      })}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <ListaCargos state={d.state} items={d.items} />
          {d.items.some((c) => c.sueldoSensible) ? (
            <Alerta
              tono="neutral"
              icono={Lock}
              titulo="Los cargos con sueldo sensible muestran sus montos solo a quien tiene ese permiso (owner y admin)."
            />
          ) : null}
          <HojaCargo />
        </div>
      )}
    </PaginaPortal>
  );
}
