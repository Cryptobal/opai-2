import { cn } from "../../cn";
import type { ItemMenu } from "../../components/menu";
import { BTN_LINEA, FILA, SOBRE } from "./estilos";
import { IconoHilo } from "./iconos";
import type { PortalHilo } from "./tipos";

type Props = {
  portales: readonly PortalHilo[];
  portalActual: string;
  /** Empresas a las que se puede cambiar (vacío si solo hay una). */
  empresas: readonly ItemMenu[];
  /** Lo que el marco clásico ofrece en el menú de usuario: cuenta, preferencias, novedades, salir. */
  cuenta: readonly ItemMenu[];
  onTema: () => void;
};

const VALOR = "flex-none font-mono text-base font-semibold tabular-nums";
const LISTA = "flex max-w-[900px] flex-col border-t border-border";

function Texto({ a, b }: { a: string; b?: string | undefined }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-base font-medium text-fg">{a}</span>
      {b ? <span className="truncate text-sm text-fg-muted">{b}</span> : null}
    </span>
  );
}

function FilaMenu({ item }: { item: ItemMenu }) {
  return (
    <button
      type="button"
      onClick={item.onSelect}
      disabled={item.deshabilitado}
      className={cn(FILA, "transition-colors hover:bg-fill")}
    >
      <Texto a={item.etiqueta} b={item.descripcion} />
      {item.marcado ? <span className={cn(VALOR, "text-accent")}>Aquí estás</span> : null}
      {item.punto ? <span aria-hidden className="size-2 flex-none rounded-full bg-accent" /> : null}
    </button>
  );
}

function Seccion({ titulo, items }: { titulo: string; items: readonly ItemMenu[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className={SOBRE}>{titulo}</h2>
      <div className={LISTA}>
        {items.map((i) => (
          <FilaMenu key={i.id} item={i} />
        ))}
      </div>
    </section>
  );
}

/** Portales: dónde estás y a qué otros portales puedes entrar; debajo, tus empresas y tu cuenta. */
export function PortalesHilo({ portales, portalActual, empresas, cuenta, onTema }: Props) {
  return (
    <>
      <div className={LISTA}>
        {portales.map((p) => {
          const aqui = p.id === portalActual;
          return (
            <a
              key={p.id}
              href={p.href}
              aria-current={aqui ? "page" : undefined}
              className={cn(FILA, "transition-colors hover:bg-fill")}
            >
              <Texto a={p.etiqueta} b={p.descripcion} />
              <span className={cn(VALOR, aqui ? "text-accent" : "text-fg")}>
                {aqui ? "Aquí estás" : "Entrar"}
              </span>
              <IconoHilo nombre="flecha" tam={16} className="flex-none text-fg-muted" />
            </a>
          );
        })}
      </div>
      <div>
        <button type="button" onClick={onTema} className={BTN_LINEA}>
          Cambiar entre tema claro y oscuro
        </button>
      </div>
      <Seccion titulo="Empresas" items={empresas} />
      <Seccion titulo="Tu cuenta" items={cuenta} />
    </>
  );
}
