import { Upload } from "lucide-react";

import { Badge, type Columna, ListScreen } from "@opai/ds";
import { etiquetaRelativa, type GrupoVencimiento } from "@opai/domain";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { LinkNext } from "@/app/_components/link-next";
import { fecha } from "@/lib/fechas";

import type { FilaVencimiento } from "./datos";

type Fila = FilaVencimiento & { dias: number };
type Grupo = GrupoVencimiento<FilaVencimiento>;

const RUTA: Record<string, string> = {
  cuenta: "cuentas",
  instalacion: "instalaciones",
  persona: "personas",
};
const nombreDe = (d: Fila) => d.titulo ?? d.nombre;
const rutaDe = (d: Fila) => {
  const seg = d.entidad ? RUTA[d.entidad.tipo] : undefined;
  return seg && d.entidad ? `/${seg}/${d.entidad.id}` : null;
};
/** Abre la hoja de subir (`?subir=1`) para renovar este documento: reemplaza a la versión vencida. */
const renovar = (d: Fila) => `?subir=1&reemplaza=${d.id}${d.tipoId ? `&tipo=${d.tipoId}` : ""}`;

function Entidad({ d, etiquetas }: { d: Fila; etiquetas: Record<string, string> }) {
  const tipo = etiquetas[d.entidad?.tipo ?? ""] ?? "—";
  const ruta = rutaDe(d);
  const nombre = d.entidad?.nombre ?? tipo;
  return (
    <span className="flex min-w-0 flex-col">
      {ruta && d.entidad?.nombre ? (
        <LinkNext href={ruta} className="truncate font-medium text-accent hover:underline">
          {nombre}
        </LinkNext>
      ) : (
        <span className="truncate">{nombre}</span>
      )}
      {d.entidad?.nombre ? <span className="t-caption">{tipo}</span> : null}
    </span>
  );
}

function Accion({ d, puedeSubir }: { d: Fila; puedeSubir: boolean }) {
  return puedeSubir ? (
    <EnlaceBotonHoja
      href={renovar(d)}
      variante="secondary"
      icono={Upload}
      etiqueta={`Subir renovación de ${nombreDe(d)}`}
    >
      Subir renovación
    </EnlaceBotonHoja>
  ) : null;
}

function columnas(
  tono: Grupo["tono"],
  puedeSubir: boolean,
  etiquetas: Record<string, string>,
): Columna<Fila>[] {
  return [
    {
      id: "documento",
      etiqueta: "Documento",
      render: (d) => <span className="font-medium">{nombreDe(d)}</span>,
    },
    {
      id: "entidad",
      etiqueta: "Vinculado a",
      render: (d) => <Entidad d={d} etiquetas={etiquetas} />,
    },
    {
      id: "vence",
      etiqueta: "Vence",
      render: (d) => (
        <span className="flex items-center gap-2">
          <span className="t-numeric">{fecha(d.venceEn)}</span>
          <Badge tono={tono}>{etiquetaRelativa(d.dias)}</Badge>
        </span>
      ),
    },
    {
      id: "accion",
      etiqueta: "",
      className: "text-right",
      render: (d) => <Accion d={d} puedeSubir={puedeSubir} />,
    },
  ];
}

/** Una banda de la pantalla 04: «Vencidos (2)», «Vencen en 30 días (2)»… con tabla en md+ y tarjetas en teléfono. */
export function GrupoVencimientos({
  grupo,
  puedeSubir,
  etiquetas,
}: {
  grupo: Grupo;
  puedeSubir: boolean;
  etiquetas: Record<string, string>;
}) {
  return (
    <section aria-labelledby={`g-${grupo.id}`} className="flex flex-col gap-2">
      <h2 id={`g-${grupo.id}`} className="t-subheading flex items-center gap-2">
        {grupo.titulo}
        <span className="t-caption">({grupo.items.length})</span>
      </h2>
      <ListScreen<Fila>
        state="ready"
        titulo={grupo.titulo}
        sinCabecera
        items={grupo.items}
        clave={(d) => d.id}
        Link={LinkNext}
        tarjeta={(d) => (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-base font-medium text-fg">{nombreDe(d)}</span>
              <span className="t-caption truncate">
                {[d.entidad?.nombre ?? etiquetas[d.entidad?.tipo ?? ""], fecha(d.venceEn)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <Badge tono={grupo.tono} className="self-start">
                {etiquetaRelativa(d.dias)}
              </Badge>
            </span>
            <Accion d={d} puedeSubir={puedeSubir} />
          </>
        )}
        columnas={columnas(grupo.tono, puedeSubir, etiquetas)}
      />
    </section>
  );
}
