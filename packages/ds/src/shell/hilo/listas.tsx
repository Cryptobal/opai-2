import { cn } from "../../cn";
import { Skeleton } from "../../components/skeleton";
import type { LinkComponent } from "../types";
import { BTN_LINEA, BTN_TINTA } from "./estilos";
import { IconoHilo } from "./iconos";
import type { EstadoLista, FilaHilo, ListaHilo, PendienteHilo } from "./tipos";
import { pendienteAbierto } from "./vista";

const TONO = { ok: "text-success-fg", aviso: "text-warning-fg", alerta: "text-danger-fg" } as const;

/** Estados que no son la lista: cargando, error y sin permiso. Nunca dicen «no hay nada». */
function Estado(p: { estado: EstadoLista; sinPermiso: string; onReintentar?: (() => void) | undefined }) {
  if (p.estado === "cargando")
    return (
      <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ))}
      </div>
    );
  if (p.estado === "sin-permiso") return <p className="py-7 text-base text-fg-muted">{p.sinPermiso}</p>;
  return (
    <div className="flex flex-col items-start gap-3 py-7">
      <p className="text-base text-fg-muted">No pudimos cargar esta parte del hilo.</p>
      {p.onReintentar ? (
        <button type="button" onClick={p.onReintentar} className={BTN_LINEA}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

type PropsPendientes = {
  lista: ListaHilo<PendienteHilo>;
  rutaActual: string;
  inicioHref: string;
  onReintentar?: (() => void) | undefined;
  Link: LinkComponent;
};

/** «Pendientes»: lo que espera una respuesta, con su origen, su contexto y la acción que lo resuelve. */
export function PendientesHilo({ lista, rutaActual, inicioHref, onReintentar, Link }: PropsPendientes) {
  if (lista.estado !== "listo")
    return <Estado estado={lista.estado} sinPermiso="" onReintentar={onReintentar} />;
  if (lista.items.length === 0)
    return (
      <div className="flex flex-col items-start gap-1.5 py-9">
        <IconoHilo nombre="check" tam={28} className="text-success-fg" />
        <p className="text-lg font-semibold text-fg">Nada espera tu decisión.</p>
        <p className="text-base text-fg-muted">Te avisamos si aparece algo.</p>
      </div>
    );
  return (
    <ul className="flex flex-col">
      {lista.items.map((d) => (
        <li key={d.id}>
          <div
            className={cn(
              "-mx-3 flex flex-col gap-2 rounded-lg px-3 py-3.5",
              pendienteAbierto(rutaActual, d.href, inicioHref) && "bg-fill",
            )}
          >
            <div
              {...(d.agente ? { "data-agente": "true" } : {})}
              className={cn(
                "flex items-center gap-2 text-xs font-semibold",
                d.agente ? "text-accent" : "text-fg",
              )}
            >
              <span aria-hidden className="size-2 flex-none rounded-full bg-current" />
              <span>{d.origen}</span>
              {d.area ? <span className="font-normal text-fg-muted">· {d.area}</span> : null}
            </div>
            <Link href={d.href} className="flex min-h-11 items-center t-hilo-item text-fg">
              {d.titulo}
            </Link>
            {d.contexto ? <p className="text-base text-fg-muted">{d.contexto}</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={d.href} className={BTN_TINTA} aria-label={`${d.accion}: ${d.titulo}`}>
                {d.accion}
              </Link>
            </div>
          </div>
          <div aria-hidden className="h-px bg-border" />
        </li>
      ))}
    </ul>
  );
}

type PropsFilas = {
  lista: ListaHilo<FilaHilo>;
  vacio: string;
  sinPermiso: string;
  onReintentar?: (() => void) | undefined;
  Link: LinkComponent;
};

/** «Actividad» y «Agenda»: una línea por hecho, con la hora a la izquierda. */
export function FilasHilo({ lista, vacio, sinPermiso, onReintentar, Link }: PropsFilas) {
  if (lista.estado !== "listo")
    return <Estado estado={lista.estado} sinPermiso={sinPermiso} onReintentar={onReintentar} />;
  if (lista.items.length === 0) return <p className="py-7 text-base text-fg-muted">{vacio}</p>;
  const clase = "flex min-h-11 items-start gap-3 border-b border-border py-3.5 text-base text-fg";
  return (
    <ul className="flex flex-col">
      {lista.items.map((f) => {
        const cuerpo = (
          <>
            <span className="w-16 flex-none font-mono text-xs leading-5 text-fg-muted tabular-nums">
              {f.cuando}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              {f.quien ? (
                <span className={cn("text-xs font-semibold", f.agente ? "text-accent" : "text-fg")}>
                  {f.quien}
                </span>
              ) : null}
              <span>{f.texto}</span>
              {f.nota ? (
                <span className={cn("text-xs font-semibold", f.tono ? TONO[f.tono] : "text-fg-muted")}>
                  {f.nota}
                </span>
              ) : null}
            </span>
          </>
        );
        return (
          <li key={f.id}>
            {f.href ? (
              <Link href={f.href} className={clase}>
                {cuerpo}
              </Link>
            ) : (
              <div className={clase}>{cuerpo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
