import { AlertTriangle, Inbox, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";
import { Skeleton } from "../components/skeleton";

type EstadoProps = { titulo: string; descripcion?: string; accion?: ReactNode; className?: string };

function Marco({
  icono,
  titulo,
  descripcion,
  accion,
  className,
  rol = "status",
}: EstadoProps & { icono: ReactNode; rol?: "status" | "alert" }) {
  return (
    <div
      role={rol}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-bg text-fg-muted">
        {icono}
      </div>
      <p className="text-md font-medium text-fg">{titulo}</p>
      {descripcion ? <p className="max-w-sm text-base text-fg-muted">{descripcion}</p> : null}
      {accion ? <div className="mt-1">{accion}</div> : null}
    </div>
  );
}

/** Vacío: una línea de texto y una acción. */
export function Empty(props: EstadoProps) {
  return <Marco icono={<Inbox className="size-6" />} {...props} />;
}

/** Error: qué pasó, qué hacer, reintentar. */
export function ErrorState(props: EstadoProps) {
  return (
    <Marco rol="alert" icono={<AlertTriangle className="size-6 text-danger-fg" />} {...props} />
  );
}

/** Sin permisos: explicación breve y a quién pedir acceso. */
export function Forbidden(props: Partial<EstadoProps>) {
  return (
    <Marco
      icono={<Lock className="size-6" />}
      titulo={props.titulo ?? "No tienes acceso a esta sección"}
      descripcion={props.descripcion ?? "Pide acceso al administrador de tu empresa."}
      {...(props.accion ? { accion: props.accion } : {})}
      {...(props.className ? { className: props.className } : {})}
    />
  );
}

export type VarianteLoading = "lista" | "detalle" | "formulario" | "planilla" | "dashboard";

/** Skeletons con la forma del contenido. Nunca un spinner de página completa. */
export function Loading({
  variante = "lista",
  className,
  diferido = false,
}: {
  variante?: VarianteLoading;
  className?: string;
  /** Aparece solo si la carga pasa de ~150 ms: una carga rápida no deja ni un destello. */
  diferido?: boolean;
}) {
  const filas = variante === "dashboard" ? 4 : variante === "formulario" ? 5 : 6;
  return (
    <div
      aria-busy
      aria-label="Cargando"
      className={cn(
        "flex flex-col gap-3",
        diferido && "animate-[ds-aparecer_150ms_ease-out_150ms_backwards]",
        className,
      )}
    >
      {variante === "dashboard" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: filas }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        Array.from({ length: filas }, (_, i) => (
          <Skeleton
            key={i}
            className={
              variante === "planilla" ? "h-9" : variante === "formulario" ? "h-11" : "h-16"
            }
          />
        ))
      )}
    </div>
  );
}
