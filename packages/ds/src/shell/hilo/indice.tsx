import type { LinkComponent } from "../types";
import { SOBRE } from "./estilos";
import { IconoHilo } from "./iconos";
import type { AreaIndice } from "./tipos";

type Props = { areas: readonly AreaIndice[]; onElegir: () => void; Link: LinkComponent };

/** Índice: todas las pantallas del portal por área, a un toque. Reemplaza a la barra lateral. */
export function IndiceHilo({ areas, onElegir, Link }: Props) {
  if (areas.length === 0)
    return <p className="text-base text-fg-muted">No tienes pantallas disponibles en este portal.</p>;
  return (
    <nav
      aria-label="Índice"
      className="grid gap-x-8 gap-y-7 lg:grid-cols-2 hilo:grid-cols-3"
    >
      {areas.map((a) => (
        <section key={a.id} className="flex min-w-0 flex-col">
          <h2 className={`${SOBRE} border-b border-border pb-2`}>{a.nombre}</h2>
          {a.entradas.map((n) => (
            <Link
              key={`${n.href}|${n.etiqueta}`}
              href={n.href}
              onClick={onElegir}
              className="flex min-h-11 items-center gap-2 border-b border-border t-hilo-lead text-fg transition-colors hover:bg-fill"
            >
              <span className="min-w-0 flex-1 truncate">{n.etiqueta}</span>
              <IconoHilo nombre="flecha" tam={16} className="flex-none text-fg-muted" />
            </Link>
          ))}
        </section>
      ))}
    </nav>
  );
}
