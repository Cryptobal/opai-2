import { formatearFechaHora } from "@opai/domain";
import { type Columna, ListScreen, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Registro } from "@/app/(erp)/accesos/_componentes/datos";
import { estadoRegistro, tipoDe } from "@/app/(erp)/accesos/_componentes/etiquetas";
import { COLUMNAS } from "@/app/(erp)/accesos/_componentes/pestana-accesos";
import { Tarjeta } from "@/app/(erp)/accesos/_componentes/tablas-instalacion";

import { type Listas, ListasCliente } from "./listas-cliente";
import { ruta, type Vista } from "./ruta";
import { type Visitas, VisitasCliente } from "./visitas-cliente";

export type Instalacion = { id: string; nombre: string };

type Props = {
  items: Registro[];
  siguiente: string | null;
  instalaciones: Instalacion[];
  instalacion: string | undefined;
  vista: Vista;
  listas: Listas | null;
  visitas: Visitas | null;
};

const COLUMNAS_CLIENTE: Columna<Registro>[] = [
  ...COLUMNAS.slice(0, 1),
  { id: "instalacion", etiqueta: "Instalación", render: (x) => x.instalacion },
  ...COLUMNAS.slice(1),
];

/** Elegir instalación; en listas no hay «Todas», porque cada lista es de una instalación. */
function SegmentoInstalacion({ instalaciones, instalacion, vista }: Props) {
  if (instalaciones.length < 2) return null;
  const opciones = instalaciones.map((i) => ({
    id: i.id,
    etiqueta: i.nombre,
    href: ruta({ instalacion: i.id, vista }),
  }));
  return (
    <Segmentado
      etiqueta="Instalación"
      activa={instalacion ?? "todas"}
      Link={LinkNext}
      opciones={
        vista === "listas"
          ? opciones
          : [{ id: "todas", etiqueta: "Todas", href: ruta({ vista }) }, ...opciones]
      }
    />
  );
}

function Registros({ items, siguiente, instalacion, vista }: Props) {
  const enSitio = vista === "en_sitio";
  return (
    <>
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
          href={ruta({ instalacion, vista, cursor: siguiente })}
          className="t-label self-start px-4 py-3 text-accent"
        >
          Siguiente página
        </LinkNext>
      ) : null}
    </>
  );
}

/**
 * En sitio y registros de las instalaciones del cliente (CAR-481), de solo lectura y con el documento
 * enmascarado, sus visitas prerregistradas (CAR-539) y sus listas autorizada y bloqueada si su empresa de
 * seguridad se lo habilitó (CAR-538).
 */
export function AccesosCliente(props: Props) {
  const { instalaciones, instalacion, vista, listas, visitas } = props;
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
          { id: "visitas", etiqueta: "Visitas", href: ruta({ instalacion, vista: "visitas" }) },
          { id: "listas", etiqueta: "Listas", href: ruta({ instalacion, vista: "listas" }) },
        ]}
      />
      <SegmentoInstalacion {...props} />
      {vista === "visitas" && visitas ? (
        <VisitasCliente instalaciones={instalaciones} instalacion={instalacion} visitas={visitas} />
      ) : vista === "listas" && listas && instalacion ? (
        <ListasCliente instalacion={instalacion} listas={listas} />
      ) : vista === "listas" ? (
        <p className="t-body text-fg-muted">Tu cuenta aún no tiene instalaciones.</p>
      ) : (
        <Registros {...props} />
      )}
    </div>
  );
}
