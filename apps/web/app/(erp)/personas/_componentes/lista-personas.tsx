import { Plus } from "lucide-react";

import { Avatar, Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ESTADO_PERSONA, estadoDe, TIPO_CONTRATO } from "@/app/_components/maestros/estados";
import { fecha, rut } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";
import type { PersonaFila } from "@/lib/tipos-maestros";

import { Paginacion } from "./paginacion";
import { SemaforoDocs } from "./semaforo-docs";

type Props = {
  state: EstadoPantalla;
  items: PersonaFila[];
  cargos: { valor: string; etiqueta: string }[];
  siguiente: string | null;
  total: number | null;
  p: Parametros;
  titulo: string;
};

const estadoVisible = (x: PersonaFila) =>
  estadoDe(ESTADO_PERSONA, x.bloqueada ? "bloqueada" : x.estado);

export const contrato = (x: PersonaFila) => {
  const v = x.vinculoVigente;
  if (!v) return "—";
  const tipo = TIPO_CONTRATO[v.tipo] ?? v.tipo;
  return v.termino ? `${tipo} hasta ${fecha(v.termino)}` : tipo;
};

/** Personas (10, 53, 54): tabla en md+, lista agrupada por letra en teléfono. */
export function ListaPersonas(x: Props) {
  const nueva = (
    <EnlaceBoton href="?nueva=1" icono={Plus}>
      Nueva
    </EnlaceBoton>
  );
  const filtrando = Boolean(x.p["q"] || x.p["cargo"] || x.p["estado"]);
  return (
    <ListScreen<PersonaFila>
      state={x.state}
      titulo={x.titulo}
      soloTelefono
      subtitulo={`${x.total ?? x.items.length} ${x.total === 1 ? "persona" : "personas"}`}
      accionPrincipal={nueva}
      buscador={<Buscador placeholder="Nombre o RUT" />}
      filtros={
        <ChipsFiltro
          filtros={[
            { param: "cargo", etiqueta: "Cargo", opciones: x.cargos },
            {
              param: "estado",
              etiqueta: "Estado",
              opciones: Object.entries(ESTADO_PERSONA).map(([valor, e]) => ({
                valor,
                etiqueta: e.etiqueta,
              })),
            },
          ]}
        />
      }
      items={x.items}
      clave={(i) => i.id}
      href={(i) => `/personas/${i.id}`}
      Link={LinkNext}
      grupo={(i) => (i.apellidos[0] ?? "#").toUpperCase()}
      tarjeta={(i) => {
        const e = estadoVisible(i);
        return (
          <>
            <Avatar nombre={i.nombreCompleto} size="lg" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-medium text-fg">{i.nombreCompleto}</span>
              <span className="truncate text-sm text-fg-muted">
                {i.vinculoVigente?.cargo ?? "Sin vínculo vigente"}
              </span>
            </span>
            {e.tono === "success" ? (
              <SemaforoDocs d={i.documentos} />
            ) : (
              <Badge tono={e.tono} punto>
                {e.etiqueta}
              </Badge>
            )}
          </>
        );
      }}
      columnas={[
        {
          id: "persona",
          etiqueta: "Persona",
          render: (i) => (
            <span className="flex items-center gap-2.5">
              <Avatar nombre={i.nombreCompleto} size="sm" />
              {i.nombreCompleto}
            </span>
          ),
        },
        { id: "rut", etiqueta: "RUT", render: (i) => rut(i.rut), className: "t-mono" },
        { id: "cargo", etiqueta: "Cargo", render: (i) => i.vinculoVigente?.cargo ?? "—" },
        { id: "contrato", etiqueta: "Contrato", render: contrato },
        {
          id: "estado",
          etiqueta: "Estado",
          render: (i) => {
            const e = estadoVisible(i);
            return (
              <Badge tono={e.tono} punto>
                {e.etiqueta}
              </Badge>
            );
          },
        },
        { id: "docs", etiqueta: "Documentos", render: (i) => <SemaforoDocs d={i.documentos} /> },
      ]}
      textos={{
        vacio: filtrando
          ? { titulo: "Sin resultados", descripcion: "Revisa la ortografía o busca por RUT." }
          : {
              titulo: `Aún no hay ${x.titulo.toLowerCase()}`,
              descripcion: "Agrega la primera persona con su vínculo laboral.",
              accion: nueva,
            },
      }}
      paginacion={
        <Paginacion
          p={x.p}
          mostrados={x.items.length}
          siguiente={x.siguiente}
          total={filtrando ? null : x.total}
        />
      }
    />
  );
}
