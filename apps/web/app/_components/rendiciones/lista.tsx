import type { ReactNode } from "react";

import { Badge, type Columna, ListScreen, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { fechaDe, lineaEstado, pesos, revisaDe } from "./formato";
import {
  BASE,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  type PortalRendicion,
  type ResumenRendicion,
  TONO_ESTADO,
} from "./tipos";

const Estadotag = ({ r }: { r: ResumenRendicion }) => (
  <Badge tono={TONO_ESTADO[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Badge>
);

/** Motivo que escribió quien revisó: texto de otra persona, se muestra como dato. */
function Motivo({ r }: { r: ResumenRendicion }) {
  if (!r.motivoDecision || (r.estado !== "devuelta" && r.estado !== "rechazada")) return null;
  const devuelta = r.estado === "devuelta";
  return (
    <p className="rounded-md bg-warning-muted px-3 py-2 text-base text-warning-fg" role="note">
      <span className="font-semibold">
        {devuelta ? "Devuelta" : "Rechazada"}
        {r.aprobadorNombre ? ` por ${r.aprobadorNombre}` : ""}:
      </span>{" "}
      «{r.motivoDecision}»{devuelta ? " Corrígela y reenvíala." : ""}
    </p>
  );
}

const Corregir = ({
  r,
  portal,
  className,
}: {
  r: ResumenRendicion;
  portal: PortalRendicion;
  className?: string;
}) =>
  r.estado === "devuelta" ? (
    <EnlaceBoton
      href={`${BASE[portal]}/${r.id}/corregir`}
      variante="primary"
      {...(className ? { className } : {})}
    >
      Corregir y reenviar
    </EnlaceBoton>
  ) : null;

function columnasDe(portal: PortalRendicion): readonly Columna<ResumenRendicion>[] {
  return [
    {
      id: "codigo",
      etiqueta: "Código",
      render: (r) => <span className="font-medium">{r.codigoVisible}</span>,
    },
    {
      id: "motivo",
      etiqueta: "Motivo",
      render: (r) => (
        <>
          <span className="block">{r.descripcion}</span>
          <span className="text-sm text-fg-muted">{ETIQUETA_TIPO[r.tipo] ?? r.tipo}</span>
          <span className="block text-sm text-fg-muted xl:hidden">
            {fechaDe(r)} · {revisaDe(r)}
          </span>
          {r.estado === "devuelta" && r.motivoDecision ? (
            <span className="mt-1 block text-sm text-warning-fg">Devuelta: {r.motivoDecision}</span>
          ) : null}
        </>
      ),
    },
    {
      id: "total",
      etiqueta: "Total",
      className: "text-right",
      render: (r) => <span className="tabular-nums">{pesos(r.montoTotal)}</span>,
    },
    {
      id: "estado",
      etiqueta: "Estado",
      render: (r) => <Estadotag r={r} />,
    },
    {
      id: "fecha",
      etiqueta: "Fecha",
      className: "hidden xl:table-cell",
      render: (r) => fechaDe(r),
    },
    {
      id: "revisa",
      etiqueta: "Quién revisa",
      className: "hidden xl:table-cell",
      render: (r) => revisaDe(r).replace("Revisa: ", ""),
    },
  ];
}

/** «Mis rendiciones»: patrón ListScreen (CAR-545/589); compartido ERP y supervisor. */
export function ListaRendiciones({
  state,
  items,
  portal,
  textos,
}: {
  state: EstadoPantalla;
  items: readonly ResumenRendicion[];
  portal: PortalRendicion;
  textos: { titulo: string; descripcion: string; accion?: ReactNode };
}) {
  return (
    <ListScreen
      state={state}
      titulo="Mis rendiciones"
      sinCabecera
      items={items}
      clave={(r) => r.id}
      href={(r) => `${BASE[portal]}/${r.id}`}
      Link={LinkNext}
      tarjeta={(r) => (
        <div className="flex w-full flex-col gap-2">
          <span className="flex items-center justify-between gap-2">
            <span className="t-label text-fg">{r.codigoVisible}</span>
            <Estadotag r={r} />
          </span>
          <span className="text-md font-medium text-fg">{r.descripcion}</span>
          <span className="t-title text-fg">{pesos(r.montoTotal)}</span>
          <span className="text-base text-fg-muted">{lineaEstado(r)}</span>
          <Motivo r={r} />
        </div>
      )}
      acciones={(r) => <Corregir r={r} portal={portal} className="w-full md:w-auto" />}
      columnas={columnasDe(portal)}
      textos={{
        vacio: {
          titulo: textos.titulo,
          descripcion: textos.descripcion,
          ...(textos.accion ? { accion: textos.accion } : {}),
        },
      }}
    />
  );
}