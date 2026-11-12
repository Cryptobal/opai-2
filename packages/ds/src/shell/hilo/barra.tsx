import { cn } from "../../cn";
import { PAD_LIENZO } from "./estilos";
import { IconoHilo } from "./iconos";

type Props = {
  /** Hay agente: la barra invita a pedir y lleva su color. Sin agente, busca y va en tinta (ADR-090). */
  agente: boolean;
  /** Texto de la caja: «Pide, pregunta o busca una pantalla» o «Busca una pantalla o un registro». */
  texto: string;
  /** Texto para teléfono (bajo 640 px), donde el largo se corta. */
  textoCorto?: string;
  onBuscar: () => void;
  className?: string;
};

/**
 * Barra del marco Hilo, con la forma del diseño: caja de 56 px, icono, texto y botón de enviar. En
 * esta etapa (H1) toda la caja es un botón que abre la búsqueda —que donde hay agente también ofrece
 * preguntarle—; el contexto de la pantalla y las sugerencias llegan en H4. Siempre al pie: del lienzo
 * desde 1024 px y de toda la pantalla en teléfono.
 */
export function BarraHilo({ agente, texto, textoCorto, onBuscar, className }: Props) {
  return (
    <div
      data-barra={agente ? "agente" : "busqueda"}
      className={cn(
        "flex-none bg-bg pt-2 pb-[calc(22px+env(safe-area-inset-bottom))] lg:border-t lg:border-border lg:bg-surface lg:pt-2.5 lg:pb-4",
        PAD_LIENZO,
        className,
      )}
    >
      <button
        type="button"
        onClick={onBuscar}
        className="flex h-14 w-full max-w-[900px] items-center gap-1 rounded-[18px] border border-border bg-surface pr-1.5 pl-4 text-left shadow-overlay hover:border-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <IconoHilo
          nombre={agente ? "chispa" : "buscar"}
          className={cn("flex-none", agente ? "text-accent" : "text-fg-muted")}
        />
        {textoCorto ? (
          <>
            <span className="min-w-0 flex-1 truncate px-2 text-md text-fg-muted sm:hidden">
              {textoCorto}
            </span>
            <span className="hidden min-w-0 flex-1 truncate px-2 text-md text-fg-muted sm:block">
              {texto}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate px-2 text-md text-fg-muted">{texto}</span>
        )}
        <span
          aria-hidden
          className={cn(
            "inline-flex size-11 flex-none items-center justify-center rounded-[14px]",
            agente ? "bg-accent text-accent-fg" : "bg-fg text-bg",
          )}
        >
          <IconoHilo nombre="subir" />
        </span>
      </button>
    </div>
  );
}
