import { Briefcase, Lock, Plus } from "lucide-react";

import { Badge, type EstadoPantalla } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conBusqueda } from "@/lib/parametros";

import { CLASES, type CargoFila } from "./datos";

const clase = (v: string) => CLASES.find((c) => c.valor === v)?.etiqueta ?? v;
const plural = (n: number, uno: string, muchos: string) => `${n} ${n === 1 ? uno : muchos}`;

function Nombre({ c }: { c: CargoFila }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      {c.nombre}
      {c.sueldoSensible ? (
        <Lock className="size-3.5 text-fg-subtle" aria-label="Sueldo sensible" />
      ) : null}
    </span>
  );
}

/** Columna de cargos (14): catálogo sin montos; lista + ficha como Cuentas. */
export function ListaCargos({
  state,
  items,
  seleccionada,
  q,
  puedeGestionar,
}: {
  state: EstadoPantalla;
  items: CargoFila[];
  seleccionada?: string;
  q?: string;
  puedeGestionar: boolean;
}) {
  const activos = items.filter((c) => c.activo).length;
  const nuevo = puedeGestionar ? (
    <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
      Nuevo
    </EnlaceBotonHoja>
  ) : undefined;
  return (
    <ListaMaestro
      state={state}
      titulo="Cargos"
      accion={nuevo}
      accionFlotante={Boolean(nuevo)}
      buscar="Buscar cargo"
      filtros={[
        { param: "clase", etiqueta: "Clase", opciones: CLASES },
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: [
            { valor: "activo", etiqueta: "Activo" },
            { valor: "inactivo", etiqueta: "Inactivo" },
          ],
        },
      ]}
      meta={{
        izquierda: `${items.length} cargos · ${activos} ${activos === 1 ? "activo" : "activos"}`,
        derecha: "Nombre A–Z",
      }}
      seleccionada={seleccionada}
      vacio={{
        titulo: "Sin cargos",
        descripcion: puedeGestionar ? "Crea el primero o ajusta los filtros." : "Ajusta los filtros.",
        accion: nuevo,
      }}
      filas={items.map((c) => ({
        id: c.id,
        href: conBusqueda(`/cargos/${c.id}`, q),
        inicio: (
          <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
            <Briefcase className="size-4" aria-hidden />
          </span>
        ),
        titulo: <Nombre c={c} />,
        secundario: (
          <>
            {clase(c.clase)}
            <span className="md:hidden"> · {c.activo ? "Activo" : "Inactivo"}</span>
            <span className="hidden md:inline">
              {" "}
              · {plural(c.personasVigentes, "persona", "personas")} · {plural(c.puestosActivos, "puesto", "puestos")}
            </span>
          </>
        ),
        terciario: (
          <span className="md:hidden">
            {plural(c.personasVigentes, "persona", "personas")} · {plural(c.puestosActivos, "puesto", "puestos")}
          </span>
        ),
        fin: (
          <Badge tono={c.activo ? "success" : "neutro"} className="hidden md:inline-flex">
            {c.activo ? "Activo" : "Inactivo"}
          </Badge>
        ),
      }))}
    />
  );
}
