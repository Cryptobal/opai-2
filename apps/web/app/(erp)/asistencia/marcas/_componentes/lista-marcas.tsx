"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, ListScreen, type EstadoPantalla } from "@opai/ds";

import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";

import { HojaMarca } from "./hoja-marca";

export type FilaMarca = {
  id: string;
  personaNombre: string;
  instalacionNombre: string;
  tipoEtiqueta: string;
  metodoEtiqueta: string;
  gpsEtiqueta: string;
  horaServidor: string;
  hash: string;
  diferida: boolean;
};

const GPS_TONO: Record<string, "success" | "warning" | "neutro"> = { Dentro: "success", Fuera: "warning", "Sin GPS": "neutro" };

export function ListaMarcas({
  state,
  items,
  zona,
  hayMas,
  marcaAbierta,
  params,
}: {
  state: EstadoPantalla;
  items: FilaMarca[];
  zona: string;
  hayMas: boolean;
  marcaAbierta: string | null;
  params: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [marcaId, setMarcaId] = useState<string | null>(marcaAbierta);
  const hora = useMemo(
    () => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: zona }),
    [zona],
  );

  const filtros = [
    { param: "metodoFamilia", etiqueta: "Método", opciones: [{ valor: "rostro", etiqueta: "Rostro" }, { valor: "pin", etiqueta: "PIN" }] },
    {
      param: "gps",
      etiqueta: "GPS",
      opciones: [
        { valor: "dentro", etiqueta: "Dentro" },
        { valor: "fuera", etiqueta: "Fuera" },
        { valor: "sin_gps", etiqueta: "Sin GPS" },
      ],
    },
  ];

  return (
    <>
      <ListScreen<FilaMarca>
        state={state}
        titulo="Marcas"
        subtitulo={`${items.length} en esta página${hayMas ? " · hay más" : ""}`}
        buscador={<Buscador placeholder="Trabajador o inicio de hash" />}
        filtros={<ChipsFiltro filtros={filtros} conservarPaginacion={false} />}
        items={items}
        clave={(m) => m.id}
        onSeleccionar={(m) => {
          setMarcaId(m.id);
          const q = new URLSearchParams({ ...params, marca: m.id } as Record<string, string>);
          router.replace(`/asistencia/marcas?${q}`, { scroll: false });
        }}
        tarjeta={(m) => (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{m.personaNombre}</span>
            <span className="t-caption text-muted">
              {hora.format(new Date(m.horaServidor))} · {m.tipoEtiqueta}
            </span>
          </span>
        )}
        columnas={[
          { id: "hora", etiqueta: "Hora", render: (m) => hora.format(new Date(m.horaServidor)) },
          { id: "persona", etiqueta: "Trabajador", render: (m) => m.personaNombre },
          { id: "inst", etiqueta: "Instalación", render: (m) => m.instalacionNombre },
          { id: "tipo", etiqueta: "Tipo", render: (m) => m.tipoEtiqueta },
          { id: "metodo", etiqueta: "Método", render: (m) => m.metodoEtiqueta },
          {
            id: "gps",
            etiqueta: "GPS",
            render: (m) => <Badge tono={GPS_TONO[m.gpsEtiqueta] ?? "neutro"}>{m.gpsEtiqueta}</Badge>,
          },
        ]}
        paginacion={
          hayMas && params.siguiente ? (
            <button
              type="button"
              className="t-body-sm text-accent hover:underline"
              onClick={() => {
                const q = new URLSearchParams({ ...params, cursor: params.siguiente } as Record<string, string>);
                router.push(`/asistencia/marcas?${q}`);
              }}
            >
              Cargar más
            </button>
          ) : null
        }
      />
      <HojaMarca
        marcaId={marcaId}
        abierta={Boolean(marcaId)}
        onCerrar={() => {
          setMarcaId(null);
          const q = new URLSearchParams(params as Record<string, string>);
          q.delete("marca");
          router.replace(`/asistencia/marcas?${q}`, { scroll: false });
        }}
        zona={zona}
      />
    </>
  );
}