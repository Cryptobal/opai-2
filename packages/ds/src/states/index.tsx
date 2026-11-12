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
  tono,
}: EstadoProps & {
  icono: ReactNode;
  rol?: "status" | "alert";
  /** Clase del tono del ícono en el marco Hilo (`styles.css`). */
  tono?: "ds-estado-icono-danger" | "ds-estado-icono-warning";
}) {
  return (
    <div role={rol} className={cn("ds-estado", className)}>
      <div className={cn("ds-estado-icono", tono)}>{icono}</div>
      <p className="ds-estado-titulo">{titulo}</p>
      {descripcion ? <p className="ds-estado-texto">{descripcion}</p> : null}
      {accion ? <div className="mt-1">{accion}</div> : null}
    </div>
  );
}

/** Vacío: una línea de texto y una acción. `icono` cambia la bandeja por uno del contexto (p. ej. el mapa). */
export function Empty({ icono, ...props }: EstadoProps & { icono?: ReactNode }) {
  return <Marco icono={icono ?? <Inbox />} {...props} />;
}

/** Error: qué pasó, qué hacer, reintentar. */
export function ErrorState(props: EstadoProps) {
  // role="alert": el lector de pantalla anuncia el error al aparecer (vacío y sin permisos son status).
  return (
    <Marco
      rol="alert"
      tono="ds-estado-icono-danger"
      icono={<AlertTriangle className="text-danger-fg" />}
      {...props}
    />
  );
}

/** Sin permisos: explicación breve y a quién pedir acceso. */
export function Forbidden(props: Partial<EstadoProps>) {
  return (
    <Marco
      tono="ds-estado-icono-warning"
      icono={<Lock />}
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
        "ds-esq flex flex-col gap-3",
        diferido && "animate-[ds-aparecer_150ms_ease-out_150ms_backwards]",
        className,
      )}
    >
      {variante === "dashboard" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 ds-grilla-kpi">
          {Array.from({ length: filas }, (_, i) => (
            <Skeleton key={i} className="h-24 ds-esq-kpi" />
          ))}
        </div>
      ) : (
        Array.from({ length: filas }, (_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "ds-esq-fila",
              variante === "planilla" ? "h-9" : variante === "formulario" ? "h-11" : "h-16",
              variante === "lista" && "ds-esq-mono",
            )}
          />
        ))
      )}
    </div>
  );
}
