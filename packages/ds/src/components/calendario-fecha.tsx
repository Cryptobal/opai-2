"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Popover } from "radix-ui";
import { type RefObject, useEffect, useState, useSyncExternalStore } from "react";

import { cn } from "../cn";
import {
  DIAS_SEMANA,
  hoyIso,
  mover,
  NOMBRES_MES,
  nombreDia,
  semanas,
  vistaDe,
} from "../lib/calendario";
import { Button } from "./button";
import { claseOverlay } from "./menu";
import { SheetRadix } from "./sheet-radix";

export type CalendarioProps = {
  /** Fecha elegida (ISO) o vacío. */
  valor: string;
  onElegir: (iso: string) => void;
  onCerrar: () => void;
  /** Campo al que se ancla en escritorio. */
  ancla: RefObject<HTMLElement | null>;
  /** Texto escrito y su manejador: en teléfono la hoja trae su propio campo para escribir. */
  texto: string;
  onTexto: (texto: string) => void;
};

const ESCRITORIO = "(min-width: 768px)";
const suscribir = (cb: () => void) => {
  const mq = window.matchMedia(ESCRITORIO);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const NAV = "size-11 flex-none";

function Cuadricula({ valor, onElegir, onCerrar }: Pick<CalendarioProps, "valor" | "onElegir" | "onCerrar">) {
  const [vista, setVista] = useState(() => vistaDe(valor));
  // Si el valor cambia (se escribe a mano), el calendario salta a esa fecha.
  useEffect(() => {
    if (valor) setVista(vistaDe(valor));
  }, [valor]);
  const hoy = hoyIso();
  const ir = (d: number) => setVista((v) => mover(v, d));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className={NAV} aria-label="Año anterior" onClick={() => ir(-12)}>
          <ChevronsLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className={NAV} aria-label="Mes anterior" onClick={() => ir(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <p aria-live="polite" className="t-subheading min-w-0 flex-1 text-center first-letter:uppercase">
          {NOMBRES_MES[vista.mes]} de {vista.anio}
        </p>
        <Button variant="ghost" size="icon" className={NAV} aria-label="Mes siguiente" onClick={() => ir(1)}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className={NAV} aria-label="Año siguiente" onClick={() => ir(12)}>
          <ChevronsRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center" role="presentation">
        {DIAS_SEMANA.map((d, i) => (
          <span key={`${d}${i}`} className="t-caption py-1 text-fg-muted">
            {d}
          </span>
        ))}
        {semanas(vista.anio, vista.mes)
          .flat()
          .map((dia) => (
            <button
              key={dia.iso}
              type="button"
              aria-label={nombreDia(dia.iso)}
              aria-pressed={dia.iso === valor}
              aria-current={dia.iso === hoy ? "date" : undefined}
              onClick={() => onElegir(dia.iso)}
              className={cn(
                "h-11 rounded-md border border-transparent text-base outline-none transition-colors duration-150",
                "hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus",
                !dia.delMes && "text-fg-muted",
                dia.iso === hoy && "border-accent",
                dia.iso === valor && "bg-accent font-medium text-accent-fg hover:bg-accent",
              )}
            >
              {dia.dia}
            </button>
          ))}
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={() => onElegir(hoy)}>
          Hoy
        </Button>
        {valor ? (
          <Button variant="ghost" onClick={() => { onElegir(""); onCerrar(); }}>
            Borrar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Calendario es-CL (semana desde el lunes, nombres en español) del campo de fecha. Escritorio:
 * panel anclado al campo, que no le quita el foco (se sigue escribiendo). Teléfono: hoja inferior
 * con su campo de texto, para no tapar las acciones del formulario.
 */
export default function CalendarioFecha(props: CalendarioProps) {
  const { valor, onElegir, onCerrar, ancla, texto, onTexto } = props;
  const escritorio = useSyncExternalStore(
    suscribir,
    () => window.matchMedia(ESCRITORIO).matches,
    () => false,
  );
  if (!escritorio)
    return (
      <SheetRadix abierto onCerrar={onCerrar} titulo="Elegir fecha" superior>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            lang="es-CL"
            placeholder="dd-mm-aaaa"
            aria-label="Escribir la fecha"
            maxLength={10}
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-md text-fg outline-none focus-visible:border-accent"
          />
          <Cuadricula valor={valor} onElegir={onElegir} onCerrar={onCerrar} />
        </div>
      </SheetRadix>
    );
  return (
    <Popover.Root open onOpenChange={(a) => !a && onCerrar()}>
      <Popover.Anchor virtualRef={ancla} />
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          aria-label="Calendario"
          onOpenAutoFocus={(e) => {
            // Abierto desde el campo: el foco se queda para seguir escribiendo; desde el botón, entra al calendario.
            if (!(document.activeElement instanceof HTMLButtonElement)) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (e.target instanceof Node && ancla.current?.contains(e.target)) e.preventDefault();
          }}
          className={cn(claseOverlay, "w-[22rem] max-w-[calc(100vw-16px)] p-3")}
        >
          <Cuadricula valor={valor} onElegir={onElegir} onCerrar={onCerrar} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
