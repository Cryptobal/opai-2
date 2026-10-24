import { CalendarClock, Plus } from "lucide-react";

import { Avatar, Badge, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ESTADO_PERSONA, estadoDe, TIPO_CONTRATO } from "@/app/_components/maestros/estados";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
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
  seleccionada?: string;
};

/** Conserva búsqueda, filtros y página al abrir una ficha (la lista no se pierde al elegir). */
export const conParametros = (p: Parametros) => {
  const q = new URLSearchParams();
  for (const k of ["q", "cargo", "estado", "cursor", "prev"]) if (p[k]) q.set(k, p[k]);
  const t = q.toString();
  return t ? `?${t}` : "";
};

const estadoVisible = (x: PersonaFila) =>
  estadoDe(ESTADO_PERSONA, x.bloqueada ? "bloqueada" : x.estado);

/** Columna de personas (10, 53): avatar, nombre, "cargo · RUT" y estado o semáforo de documentos. */
export function ListaPersonas(x: Props) {
  const nueva = (
    <EnlaceBotonHoja href="?nueva=1" icono={Plus} className="md:hidden">
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
            <>
              {i.vinculoVigente?.cargo ?? "Sin vínculo vigente"}
              {i.vinculoVigente ? (
                <span>
                  {" "}
                  · {TIPO_CONTRATO[i.vinculoVigente.tipo] ?? i.vinculoVigente.tipo}
                  {i.vinculoVigente.termino ? ` hasta ${fecha(i.vinculoVigente.termino)}` : ""}
                </span>
              ) : null}
              <span className="t-mono hidden text-[13px] md:inline"> · {rut(i.rut)}</span>
            </>
          ),
          fin: (
            <span className="flex items-center gap-1.5">
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
