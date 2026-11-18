"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ListScreen, type EstadoPantalla } from "@opai/ds";

import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";

import { columnasMarcas } from "./columnas-marcas";
import { FILTROS_MARCAS } from "./filtros-marcas";
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

type Props = {
  state: EstadoPantalla;
  items: FilaMarca[];
  zona: string;
  hayMas: boolean;
  marcaAbierta: string | null;
  params: Record<string, string | undefined>;
};

export function ListaMarcas({ state, items, zona, hayMas, marcaAbierta, params }: Props) {
  const router = useRouter();
  const [marcaId, setMarcaId] = useState<string | null>(marcaAbierta);
  const hora = useMemo(
    () => new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: zona }),
    [zona],
  );

  const abrirMarca = (id: string) => {
    setMarcaId(id);
    const q = new URLSearchParams({ ...params, marca: id } as Record<string, string>);
    router.replace(`/asistencia/marcas?${q}`, { scroll: false });
  };

  const cerrarMarca = () => {
    setMarcaId(null);
    const q = new URLSearchParams(params as Record<string, string>);
    q.delete("marca");
    router.replace(`/asistencia/marcas?${q}`, { scroll: false });
  };

  return (
    <>
      <ListScreen<FilaMarca>
        state={state}
        titulo="Marcas"
        subtitulo={`${items.length} en esta página${hayMas ? " · hay más" : ""}`}
        buscador={<Buscador placeholder="Trabajador o inicio de hash" />}
        filtros={<ChipsFiltro filtros={[...FILTROS_MARCAS]} conservarPaginacion={false} />}
        items={items}
        clave={(m) => m.id}
        onSeleccionar={(m) => abrirMarca(m.id)}
        tarjeta={(m) => (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{m.personaNombre}</span>
            <span className="t-caption text-fg-muted">
              {hora.format(new Date(m.horaServidor))} · {m.tipoEtiqueta}
            </span>
          </span>
        )}
        columnas={columnasMarcas(hora)}
        paginacion={
          hayMas && params.siguiente ? (
            <Button
              variant="secondary"
              onClick={() => {
                const q = new URLSearchParams({ ...params, cursor: params.siguiente } as Record<string, string>);
                router.push(`/asistencia/marcas?${q}`);
              }}
            >
              Cargar más
            </Button>
          ) : null
        }
      />
      <HojaMarca marcaId={marcaId} abierta={Boolean(marcaId)} onCerrar={cerrarMarca} zona={zona} />
    </>
  );
}