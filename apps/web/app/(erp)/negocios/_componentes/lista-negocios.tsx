import type { ReactNode } from "react";

import { Badge, ChipsEtiquetas, type EstadoPantalla, MonoAv } from "@opai/ds";

import { filtroDeEtiquetas, type OpcionEtiqueta } from "@/app/_components/etiquetas/opciones";

import { monograma } from "@/app/_components/maestros/estados";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { PaginacionListaMaestro } from "@/app/_components/maestros/paginacion-lista-maestro";
import { tamanoPagina } from "@/app/_components/maestros/paginacion-cursor";
import { pesos } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";

import type { NegocioFila } from "./datos";
import { consultaLista, urlExportarNegocios } from "./rutas";
import { AccionesNegocios } from "./acciones-negocios";
import { VistaNegocios } from "./vista-negocios";

const TONO = { abierto: "info", ganado: "success", perdido: "danger" } as const;
const ESTADO = { abierto: "Abierto", ganado: "Ganado", perdido: "Perdido" } as const;

const monto = (n: NegocioFila) => n.valorMensual ?? n.montoEstimadoMensual ?? null;

/** Columna de negocios: monograma de la cuenta, título, "cuenta · etapa" y estado con el monto. */
export function ListaNegocios(p: {
  state: EstadoPantalla;
  items: NegocioFila[];
  siguiente?: string | null;
  seleccionado?: string;
  p: Parametros;
  /** Etapas del embudo para el filtro (`?etapa=`, la misma que elige el tablero). */
  etapas: { valor: string; etiqueta: string }[];
  /** «Nuevo negocio» en teléfono (en md+ va en la barra superior); también en el estado vacío. */
  nuevo?: ReactNode;
  /** Catálogo de etiquetas para el filtro `?etiqueta=`. */
  etiquetas?: OpcionEtiqueta[];
  /** Con `comercial:negocios.exportar`: botón «Exportar a Excel» con los filtros de la lista. */
  puedeExportar?: boolean;
  /** Con `comercial:negocios.manage`: «Transferir cartera» (CAR-27). */
  puedeTransferir?: boolean;
}) {
  const abiertos = p.items.filter((n) => n.estado === "abierto").length;
  const consulta = consultaLista(p.p);
  const porPagina = tamanoPagina(p.p);
  const filtrando = Boolean(p.p.q || p.p.estado || p.p.etapa || p.p.etiqueta);
  const metaConteo = filtrando
    ? `${p.items.length}${p.siguiente ? "+" : ""} ${p.items.length === 1 ? "resultado" : "resultados"}`
    : `${p.items.length}${p.siguiente ? "+" : ""} negocios · ${abiertos} ${abiertos === 1 ? "abierto" : "abiertos"}`;
  return (
    <ListaMaestro
      state={p.state}
      titulo="Negocios"
      vista={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <VistaNegocios activa="lista" />
          {p.nuevo ? <span className="md:hidden">{p.nuevo}</span> : null}
          <AccionesNegocios
            acciones={[
              ...(p.puedeTransferir
                ? [{ id: "transferir" as const, href: "/negocios?vista=lista&transferir=1" }]
                : []),
              ...(p.puedeExportar ? [{ id: "exportar" as const, href: urlExportarNegocios(p.p) }] : []),
            ]}
          />
        </div>
      }
      buscar="Buscar por título"
      filtros={[
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: Object.entries(ESTADO).map(([valor, etiqueta]) => ({ valor, etiqueta })),
        },
        ...(p.etapas.length ? [{ param: "etapa", etiqueta: "Etapa", opciones: p.etapas }] : []),
        ...filtroDeEtiquetas(p.etiquetas ?? []),
      ]}
      meta={{ izquierda: metaConteo, derecha: "Recientes primero" }}
      seleccionada={p.seleccionado}
      vacio={
        filtrando
          ? {
              titulo: "Sin resultados",
              descripcion: "Prueba otro término o quita un filtro.",
            }
          : {
              titulo: "Aún no hay negocios",
              descripcion: "Los negocios que crees aparecerán aquí.",
              ...(p.nuevo ? { accion: p.nuevo } : {}),
            }
      }
      pie={
        p.state === "ready" ? (
          <PaginacionListaMaestro
            p={p.p}
            rutaBase="/negocios"
            mostrados={p.items.length}
            siguiente={p.siguiente ?? null}
            porPagina={porPagina}
          />
        ) : undefined
      }
      filas={p.items.map((n) => ({
        id: n.id,
        href: `/negocios/${n.id}${consulta}`,
        inicio: (
          <MonoAv
            texto={monograma(n.cuentaNombre || n.titulo)}
            seleccionada={p.seleccionado === n.id}
          />
        ),
        titulo: n.titulo,
        secundario: (
          <>
            {n.cuentaNombre}
            <span> · {n.etapaNombre}</span>
          </>
        ),
        terciario: (
          <>
            {monto(n) != null ? <span className="md:hidden">{pesos(monto(n))}/mes</span> : null}
            <ChipsEtiquetas compacto etiquetas={n.etiquetas ?? []} className="mt-1" />
          </>
        ),
        fin: (
          <span className="flex flex-col items-end gap-1">
            <Badge tono={TONO[n.estado]}>{ESTADO[n.estado]}</Badge>
            {monto(n) != null ? (
              <span className="t-caption hidden md:inline">{pesos(monto(n))}/mes</span>
            ) : null}
          </span>
        ),
      }))}
    />
  );
}
