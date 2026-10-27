import type { ReactNode } from "react";

import { Badge, cn, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { BadgePuesto } from "@/app/_components/maestros/badge-puesto";
import { COBERTURA_PUESTO, ESTADO_PUESTO, estadoDe } from "@/app/_components/maestros/estados";
import type { Puesto } from "@/lib/tipos-maestros";

/**
 * Trozos de una línea que bajan de renglón en vez de cortarse (CAR-8: a 375 px el horario y el
 * patrón se truncaban). Cada trozo es corto y se mantiene entero.
 */
function Trozos({ partes, className }: { partes: (string | null)[]; className: string }) {
  return (
    <span className={`flex flex-wrap gap-x-1 whitespace-normal ${className}`} data-linea-puesto>
      {partes.filter(Boolean).map((t, i, arr) => (
        <span key={i} className="whitespace-nowrap">
          {t}
          {i < arr.length - 1 ? " ·" : ""}
        </span>
      ))}
    </span>
  );
}

const secundario = (p: Puesto) => (
  <Trozos
    partes={[p.patron ?? "Sin patrón", p.funcion ?? "Sin función"]}
    className="text-fg-muted"
  />
);

const terciario = (p: Puesto) => (
  <Trozos
    partes={[
      p.horario,
      p.horarioNoche,
      p.horasSemanales != null ? `${p.horasSemanales} h/sem` : null,
    ]}
    className="t-caption"
  />
);

/** Horario de un tramo con el badge «+1 día» cuando cruza medianoche (el dominio lo marca con «(+1)»). */
function Horario({ valor }: { valor: string }) {
  const cruza = valor.endsWith(" (+1)");
  const base = cruza ? valor.slice(0, -5) : valor;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="t-numeric">{base}</span>
      {cruza ? <Badge tono="neutro">+1 día</Badge> : null}
    </span>
  );
}

/**
 * Lista de puestos (review 5662449808 punto 3): `ListScreen` del DS 2.0 (filas en teléfono, tabla
 * desde tablet), con los estados vacío, cargando y error que ya trae el patrón. `sinCabecera`: el
 * título, el subtítulo con los conteos y «Nuevo puesto» van en la pestaña (Brief 11, diseño t436u),
 * no en el patrón.
 */
export function ListaPuestos({
  state,
  puestos,
  buscador,
  filtros,
  accionVacio,
}: {
  state: EstadoPantalla;
  puestos: readonly Puesto[];
  buscador?: ReactNode;
  filtros?: ReactNode;
  accionVacio?: ReactNode;
}) {
  return (
    <ListScreen<Puesto>
      state={state}
      titulo="Puestos"
      sinCabecera
      buscador={buscador}
      filtros={filtros}
      items={puestos}
      clave={(p) => p.id}
      href={(p) => `?puesto=${p.id}`}
      Link={LinkNext}
      tarjeta={(p) => {
        const inactivo = p.estado !== "activo";
        return (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate text-base font-medium", inactivo && "text-fg-muted")}>
                {p.nombre}
              </span>
              <span className="truncate text-sm text-fg-muted">{secundario(p)}</span>
              <span className="t-caption truncate">{terciario(p)}</span>
            </span>
            <span className="flex flex-none flex-col items-end gap-1">
              <BadgePuesto estado={p.estado} cobertura={p.cobertura} />
            </span>
          </>
        );
      }}
      columnas={[
        {
          id: "puesto",
          etiqueta: "Puesto",
          className: "font-medium",
          render: (p) => (
            <span className={p.estado !== "activo" ? "text-fg-muted" : undefined}>{p.nombre}</span>
          ),
        },
        { id: "funcion", etiqueta: "Función", render: (p) => p.funcion ?? "—" },
        {
          id: "horario",
          etiqueta: "Horario",
          className: "h-auto whitespace-normal py-2.5",
          render: (p) => (
            <span className="flex flex-col gap-0.5">
              <Horario valor={p.horario} />
              {p.horarioNoche ? <Horario valor={p.horarioNoche} /> : null}
            </span>
          ),
        },
        {
          id: "patron",
          etiqueta: "Patrón",
          className: "t-numeric",
          render: (p) => p.patron ?? "—",
        },
        {
          id: "cobertura",
          etiqueta: "Cobertura",
          render: (p) => {
            if (p.estado !== "activo") return "—";
            const c = estadoDe(COBERTURA_PUESTO, p.cobertura);
            return <Badge tono={c.tono}>{c.etiqueta}</Badge>;
          },
        },
        {
          id: "estado",
          etiqueta: "Estado",
          render: (p) => {
            const e = estadoDe(ESTADO_PUESTO, p.estado);
            return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
          },
        },
      ]}
      textos={{
        vacio: {
          titulo: "Sin puestos",
          descripcion: "Crea el primero o ajusta la búsqueda y los filtros.",
          accion: accionVacio,
        },
      }}
    />
  );
}
