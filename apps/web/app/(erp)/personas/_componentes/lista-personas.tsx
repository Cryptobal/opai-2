import { CalendarClock, Plus } from "lucide-react";

import { Avatar, Badge, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ESTADO_PERSONA, estadoDe } from "@/app/_components/maestros/estados";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { rut } from "@/lib/fechas";
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
  seleccionada?: string;
};

/** Conserva búsqueda, filtros y página al abrir una ficha (la lista no se pierde al elegir). */
export const conParametros = (p: Parametros) => {
  const q = new URLSearchParams();
  for (const k of ["q", "cargo", "estado", "cursor", "prev"]) if (p[k]) q.set(k, p[k]);
  const t = q.toString();
  return t ? `?${t}` : "";
};

/** Los mismos parámetros como continuación de otra consulta (`&q=…`), para los enlaces que abren una hoja. */
export const consultaExtra = (p: Parametros) => conParametros(p).replace("?", "&");

/** `?subir=1&q=…`: abre una hoja de la ficha sin perder la búsqueda, los filtros ni la página de la lista. */
export const conHoja = (hoja: string, p: Parametros) => `?${hoja}${consultaExtra(p)}`;

const estadoVisible = (x: PersonaFila) =>
  estadoDe(ESTADO_PERSONA, x.bloqueada ? "bloqueada" : x.estado);

/**
 * Columna de personas (10, 53): avatar, nombre, "cargo · RUT" y estado o semáforo de documentos. El tipo
 * de contrato va solo en la ficha. El RUT nunca se corta: si falta ancho, se acorta el cargo.
 */
export function ListaPersonas(x: Props) {
  const nueva = (
    <EnlaceBotonHoja href="?nueva=1" icono={Plus}>
      Nueva
    </EnlaceBotonHoja>
  );
  const filtrando = Boolean(x.p["q"] || x.p["cargo"] || x.p["estado"]);
  const total = x.total ?? x.items.length;
  return (
    <ListaMaestro
      state={x.state}
      titulo={x.titulo}
      accion={
        <>
          <EnlaceBoton
            href="/personas/vencimientos"
            variante="ghost"
            icono={CalendarClock}
            etiqueta="Vencimientos"
            className="md:hidden"
          >
            {null}
          </EnlaceBoton>
          {nueva}
        </>
      }
      buscar="Buscar por nombre o RUT"
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
      meta={{
        izquierda: `${total} ${total === 1 ? "persona" : "personas"}`,
        derecha: "Apellido A–Z",
      }}
      seleccionada={x.seleccionada}
      vacio={
        filtrando
          ? { titulo: "Sin resultados", descripcion: "Revisa la ortografía o busca por RUT." }
          : {
              titulo: `Aún no hay ${x.titulo.toLowerCase()}`,
              descripcion: "Agrega la primera persona con su vínculo laboral.",
              accion: nueva,
            }
      }
      filas={x.items.map((i) => {
        const e = estadoVisible(i);
        return {
          id: i.id,
          href: `/personas/${i.id}${conParametros(x.p)}`,
          inicio: <Avatar nombre={i.nombreCompleto} size="lg" />,
          titulo: i.nombreCompleto,
          secundario: (
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="min-w-0 truncate">
                {i.vinculoVigente?.cargo ?? "Sin vínculo vigente"}
              </span>
              <span className="t-mono flex-none whitespace-nowrap text-[13px]">· {rut(i.rut)}</span>
            </span>
          ),
          // Estado y documentos en vertical: a lo ancho le quitaban el sitio al RUT en celular y iPad.
          className: "py-2",
          fin: (
            <span className="flex flex-col items-end gap-0.5">
              {e.tono === "success" ? null : (
                <Badge tono={e.tono} punto>
                  {e.etiqueta}
                </Badge>
              )}
              <SemaforoDocs d={i.documentos} />
            </span>
          ),
        };
      })}
      pie={
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Paginacion
            p={x.p}
            mostrados={x.items.length}
            siguiente={x.siguiente}
            total={filtrando ? null : x.total}
          />
        </div>
      }
    />
  );
}
