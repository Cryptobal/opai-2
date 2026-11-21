import { formatearFechaHora } from "@opai/domain";
import { Badge, type Columna, ListScreen, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Registro } from "@/app/(erp)/accesos/_componentes/datos";
import { estadoRegistro, tipoDe } from "@/app/(erp)/accesos/_componentes/etiquetas";
import { Tarjeta } from "@/app/(erp)/accesos/_componentes/tablas-instalacion";

export type Instalacion = { id: string; nombre: string };

type Props = {
  items: Registro[];
  siguiente: string | null;
  instalaciones: Instalacion[];
  instalacion: string | undefined;
  enSitio: boolean;
};

const COLUMNAS_CLIENTE: Columna<Registro>[] = [
  { id: "nombre", etiqueta: "Nombre", render: (x) => x.nombre },
  { id: "instalacion", etiqueta: "Instalación", render: (x) => x.instalacion },
  { id: "tipo", etiqueta: "Tipo", render: (x) => tipoDe(x.tipoRegistro) },
  { id: "entrada", etiqueta: "Entrada", render: (x) => formatearFechaHora(x.entradaEn) },
  {
    id: "estado",
    etiqueta: "Estado",
    render: (x) => (
      <Badge tono={estadoRegistro(x).tono} punto>
        {estadoRegistro(x).etiqueta}
      </Badge>
    ),
  },
];

const ruta = (q: Record<string, string | undefined>) => {
  const p = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => Boolean(e[1])));
  return `/cliente/accesos${p.size ? `?${p}` : ""}`;
};

/** En sitio y registros de las instalaciones del cliente (CAR-481): solo lectura, documento enmascarado. */
export function AccesosCliente({ items, siguiente, instalaciones, instalacion, enSitio }: Props) {
  const vista = enSitio ? "en_sitio" : "registros";
  return (
    <div className="flex flex-col gap-3">
      <Segmentado
        etiqueta="Vista de accesos"
        variante="plano"
        activa={vista}
        Link={LinkNext}
        opciones={[
          { id: "en_sitio", etiqueta: "En sitio", href: ruta({ instalacion }) },
          { id: "registros", etiqueta: "Registros", href: ruta({ instalacion, vista: "registros" }) },
        ]}
      />
      {instalaciones.length > 1 ? (
        <Segmentado
          etiqueta="Instalación"
          activa={instalacion ?? "todas"}
          Link={LinkNext}
          opciones={[
            { id: "todas", etiqueta: "Todas", href: ruta({ vista: enSitio ? undefined : vista }) },
            ...instalaciones.map((i) => ({
              id: i.id,
              etiqueta: i.nombre,
              href: ruta({ instalacion: i.id, vista: enSitio ? undefined : vista }),
            })),
          ]}
        />
      ) : null}
      <ListScreen<Registro>
        state="ready"
        titulo={enSitio ? "En sitio" : "Registros"}
        items={items}
        clave={(x) => x.id}
        tarjeta={(x) => (
          <Tarjeta
            titulo={x.nombre}
            sub={`${tipoDe(x.tipoRegistro)} · ${x.instalacion} · ${formatearFechaHora(x.entradaEn)}`}
            fin={estadoRegistro(x).etiqueta}
          />
        )}
        columnas={COLUMNAS_CLIENTE}
        textos={{
          vacio: {
            titulo: enSitio ? "Nadie en sitio" : "Aún no hay registros",
            descripcion: "Las entradas que registre la portería de tus instalaciones aparecerán aquí.",
          },
        }}
      />
      {siguiente ? (
        <LinkNext
          href={ruta({ instalacion, vista: enSitio ? undefined : vista, cursor: siguiente })}
          className="t-label self-start px-4 py-3 text-accent"
        >
          Siguiente página
        </LinkNext>
      ) : null}
    </div>
  );
}
