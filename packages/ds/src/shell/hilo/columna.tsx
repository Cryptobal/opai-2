import { cn } from "../../cn";
import type { LinkComponent } from "../types";
import { PAD_HILO, SIN_BARRA } from "./estilos";
import { FilasHilo, PendientesHilo } from "./listas";
import type { FilaHilo, ListaHilo, PendienteHilo, SegmentoHilo } from "./tipos";

type Props = {
  saludo: string;
  resumen: string;
  segmento: SegmentoHilo;
  onSegmento: (s: SegmentoHilo) => void;
  pendientes: ListaHilo<PendienteHilo>;
  actividad: ListaHilo<FilaHilo>;
  agenda: ListaHilo<FilaHilo>;
  rutaActual: string;
  inicioHref: string;
  onReintentar?: ((s: SegmentoHilo) => void) | undefined;
  Link: LinkComponent;
};

const SEGMENTOS: readonly { id: SegmentoHilo; nombre: string }[] = [
  { id: "pendientes", nombre: "Pendientes" },
  { id: "actividad", nombre: "Actividad" },
  { id: "agenda", nombre: "Agenda" },
];

/** El hilo: saludo, resumen y sus tres segmentos. Solo Pendientes lleva número. */
export function ColumnaHilo(p: Props) {
  const reintentar = p.onReintentar ? () => p.onReintentar?.(p.segmento) : undefined;
  return (
    <>
      <div className={cn("flex flex-none flex-col gap-1.5 py-3", PAD_HILO)}>
        <h2 className="t-hilo-saludo text-fg">{p.saludo}</h2>
        <p className="t-hilo-lead text-fg-muted">{p.resumen}</p>
      </div>
      <div className={cn("flex-none pb-2.5", PAD_HILO)}>
        <div
          role="tablist"
          aria-label="Partes del hilo"
          className="flex h-11 items-center gap-0.5 rounded-[14px] bg-fill px-[3px]"
        >
          {SEGMENTOS.map((s) => {
            const activo = s.id === p.segmento;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={`hilo-tab-${s.id}`}
                aria-selected={activo}
                aria-controls="hilo-panel"
                onClick={() => p.onSegmento(s.id)}
                className="group/seg flex h-11 flex-1 items-center outline-none"
              >
                <span
                  className={cn(
                    "flex h-[38px] w-full items-center justify-center gap-1.5 rounded-[11px] text-base transition-colors group-focus-visible/seg:outline-2 group-focus-visible/seg:outline-focus",
                    activo
                      ? "bg-surface font-semibold text-fg"
                      : "font-medium text-fg-muted group-hover/seg:text-fg",
                  )}
                >
                  <span>{s.nombre}</span>
                  {s.id === "pendientes" && p.pendientes.estado === "listo" ? (
                    <span className="font-mono text-xs text-fg-muted tabular-nums">
                      {p.pendientes.items.length}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div
        role="tabpanel"
        id="hilo-panel"
        aria-labelledby={`hilo-tab-${p.segmento}`}
        className={cn("min-h-0 flex-1 overflow-y-auto pb-4", PAD_HILO, SIN_BARRA)}
      >
        {p.segmento === "pendientes" ? (
          <PendientesHilo
            lista={p.pendientes}
            rutaActual={p.rutaActual}
            inicioHref={p.inicioHref}
            onReintentar={reintentar}
            Link={p.Link}
          />
        ) : p.segmento === "actividad" ? (
          <FilasHilo
            lista={p.actividad}
            vacio="Todavía no hay actividad."
            sinPermiso="No tienes permiso para ver la actividad."
            onReintentar={reintentar}
            Link={p.Link}
          />
        ) : (
          <FilasHilo
            lista={p.agenda}
            vacio="No tienes nada agendado."
            sinPermiso="No tienes permiso para ver la agenda."
            onReintentar={reintentar}
            Link={p.Link}
          />
        )}
      </div>
    </>
  );
}
