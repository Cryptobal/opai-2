import { ETIQUETA_CLASE_PLANTILLA, type ClasePlantilla } from "@opai/domain";
import { Badge, type Columna, ListScreen, type EstadoPantalla } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import { AvisoPlantillas, BotonesPlantillas } from "./acciones";

export type FilaPlantilla = {
  id: string;
  nombre: string;
  clase: ClasePlantilla;
  tipo: string;
  nivelFirma: "N1" | "N2";
  origen: "creada" | "word" | "pdf";
  versionVigente: number;
  ultimaEdicionPor: string | null;
  ultimaEdicionEn: string | null;
};

const ORIGEN: Record<FilaPlantilla["origen"], string> = {
  creada: "Creada en OPAI",
  word: "Importada de Word",
  pdf: "Importada de PDF",
};
const edicion = (p: FilaPlantilla) =>
  [p.ultimaEdicionPor, p.ultimaEdicionEn ? fecha(p.ultimaEdicionEn) : null]
    .filter(Boolean)
    .join(" · ") || "—";
const tipoDe = (p: FilaPlantilla) => ETIQUETA_CLASE_PLANTILLA[p.clase] ?? p.tipo;
const firma = (p: FilaPlantilla) => (
  <Badge tono={p.nivelFirma === "N2" ? "accent" : "neutro"}>{p.nivelFirma}</Badge>
);

const columnas: Columna<FilaPlantilla>[] = [
  {
    id: "nombre",
    etiqueta: "Nombre",
    render: (p) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{p.nombre}</span>
        <span className="t-caption">{ORIGEN[p.origen]}</span>
      </span>
    ),
  },
  {
    id: "tipo",
    etiqueta: "Tipo",
    render: (p) => <span className="text-fg-muted">{tipoDe(p)}</span>,
  },
  { id: "firma", etiqueta: "Firma por defecto", render: firma },
  {
    id: "version",
    etiqueta: "Versión vigente",
    render: (p) => <span className="t-numeric">v{p.versionVigente}</span>,
  },
  {
    id: "edicion",
    etiqueta: "Última edición",
    render: (p) => <span className="text-fg-muted">{edicion(p)}</span>,
  },
];

/** Pantalla 05: plantillas laborales. Los cuatro estados del diseño; el sin-permiso es el del DS. */
export function ListaPlantillas({
  state,
  plantillas,
}: {
  state: EstadoPantalla;
  plantillas: readonly FilaPlantilla[];
}) {
  return (
    <>
      <AvisoPlantillas conPlantillas={plantillas.length > 0} />
      <ListScreen<FilaPlantilla>
        state={state}
        titulo="Plantillas"
        soloTelefono
        accionPrincipal={<BotonesPlantillas />}
        items={plantillas}
        clave={(p) => p.id}
        columnas={columnas}
        tarjeta={(p) => (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-base font-medium text-fg">{p.nombre}</span>
              <span className="t-caption truncate">
                v{p.versionVigente} · {p.ultimaEdicionEn ? fecha(p.ultimaEdicionEn) : "—"} ·{" "}
                {ORIGEN[p.origen]}
              </span>
            </span>
            {firma(p)}
          </>
        )}
        textos={{
          vacio: {
            titulo: "Aún no hay plantillas laborales",
            descripcion: "Crea la primera o importa un Word o PDF que ya uses.",
          },
          error: {
            titulo: "No pudimos cargar las plantillas",
            descripcion:
              "Revisa tu conexión. Si el problema sigue, avísale a soporte con el código DOC-PLA-503.",
          },
        }}
      />
    </>
  );
}
