import { Briefcase, Lock, Plus } from "lucide-react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { CLASES, type CargoFila } from "./datos";

const clase = (v: string) => CLASES.find((c) => c.valor === v)?.etiqueta ?? v;
const conteo = (n: number) => String(n);

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

function Estado({ activo }: { activo: boolean }) {
  return <Badge tono={activo ? "success" : "neutro"}>{activo ? "Activo" : "Inactivo"}</Badge>;
}

const num = "text-right t-numeric";

/** Catálogo de cargos sin montos. */
export function ListaCargos({
  state,
  items,
  puedeGestionar,
}: {
  state: EstadoPantalla;
  items: CargoFila[];
  puedeGestionar: boolean;
}) {
  const nuevo = puedeGestionar ? (
    <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
      Nuevo
    </EnlaceBotonHoja>
  ) : undefined;
  return (
    <ListScreen<CargoFila>
      state={state}
      titulo="Cargos"
      accionPrincipal={nuevo}
      buscador={<Buscador placeholder="Buscar cargo" />}
      filtros={
        <ChipsFiltro
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
        />
      }
      items={items}
      clave={(c) => c.id}
      href={(c) => `/cargos/${c.id}`}
      Link={LinkNext}
      tarjeta={(c) => (
        <>
          <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
            <Briefcase className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <Nombre c={c} />
            <span className="truncate text-sm text-fg-muted">
              {clase(c.clase)} · {c.personasVigentes}{" "}
              {c.personasVigentes === 1 ? "persona" : "personas"}
            </span>
          </span>
          <Estado activo={c.activo} />
        </>
      )}
      columnas={[
        { id: "cargo", etiqueta: "Cargo", render: (c) => <Nombre c={c} /> },
        { id: "clase", etiqueta: "Clase", render: (c) => clase(c.clase) },
        {
          id: "personas",
          etiqueta: "Personas",
          className: num,
          render: (c) => conteo(c.personasVigentes),
        },
        {
          id: "puestos",
          etiqueta: "Puestos",
          className: num,
          render: (c) => conteo(c.puestosActivos),
        },
        {
          id: "sensible",
          etiqueta: "Sueldo sensible",
          render: (c) => (c.sueldoSensible ? "Sí" : "No"),
        },
        { id: "estado", etiqueta: "Estado", render: (c) => <Estado activo={c.activo} /> },
      ]}
      textos={{
        vacio: {
          titulo: "Sin cargos",
          descripcion: puedeGestionar
            ? "Crea el primero o ajusta los filtros."
            : "Ajusta los filtros.",
          accion: nuevo,
        },
      }}
    />
  );
}
