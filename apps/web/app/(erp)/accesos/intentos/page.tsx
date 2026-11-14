import { formatearFechaHora } from "@opai/domain";
import { Badge, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";

import { cargarIntentos, type Intento } from "../_componentes/datos";
import { MOTIVO_INTENTO, OPCIONES_MOTIVO, tipoDe } from "../_componentes/etiquetas";
import { rutaAccesos } from "../_componentes/lista-registros";
import { SegmentoAccesos } from "../_componentes/segmento-accesos";

export const metadata = { title: "Intentos denegados" };

const motivo = (i: Intento) => {
  const m = MOTIVO_INTENTO[i.motivo] ?? { etiqueta: i.motivo, tono: "neutro" as const };
  return (
    <Badge tono={m.tono} punto>
      {m.etiqueta}
    </Badge>
  );
};

/** Intentos denegados (R9): quién no pudo entrar y por qué categoría; nunca el texto del bloqueo. */
export default function IntentosDenegados({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      completo
      cargar={() => cargarIntentos(searchParams)}
    >
      {(d) => (
        <>
          <SegmentoAccesos activa="intentos" />
          <ListScreen<Intento>
            state={estadoPantalla(d.r)}
            titulo="Intentos denegados"
            filtros={
              <ChipsFiltro
                filtros={[
                  {
                    param: "instalacion",
                    etiqueta: "Instalación",
                    opciones: d.instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
                  },
                  { param: "motivo", etiqueta: "Motivo", opciones: OPCIONES_MOTIVO },
                ]}
              />
            }
            items={d.r.ok ? d.r.data.items : []}
            clave={(i) => i.id}
            tarjeta={(i) => (
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="t-numeric truncate text-base text-fg">{i.documento}</span>
                  {motivo(i)}
                </span>
                <span className="t-caption">
                  {tipoDe(i.tipoRegistro)} · {i.instalacion} · {formatearFechaHora(i.ocurrioEn)}
                </span>
              </span>
            )}
            columnas={[
              { id: "documento", etiqueta: "Documento", render: (i) => i.documento },
              { id: "tipo", etiqueta: "Tipo", render: (i) => tipoDe(i.tipoRegistro) },
              { id: "instalacion", etiqueta: "Instalación", render: (i) => i.instalacion },
              { id: "cuando", etiqueta: "Cuándo", render: (i) => formatearFechaHora(i.ocurrioEn) },
              { id: "motivo", etiqueta: "Motivo", render: motivo },
            ]}
            textos={{
              vacio: {
                titulo: "Sin intentos denegados",
                descripcion:
                  "Si la portería rechaza a alguien por lista u horario, aparecerá aquí.",
              },
            }}
          />
          {d.r.ok && d.r.data.siguiente ? (
            <LinkNext
              href={rutaAccesos("/accesos/intentos", d.p, { cursor: d.r.data.siguiente })}
              className="t-label mt-3 inline-block text-accent"
            >
              Siguiente página
            </LinkNext>
          ) : null}
        </>
      )}
    </PaginaPortal>
  );
}
