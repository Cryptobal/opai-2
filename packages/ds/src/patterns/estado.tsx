import type { ReactNode } from "react";

import { cn } from "../cn";
import { Button } from "../components/button";
import { Empty, ErrorState, Forbidden, Loading, type VarianteLoading } from "../states";

export type EstadoPantalla = "loading" | "empty" | "error" | "forbidden" | "ready";

export type TextosEstado = {
  vacio?: { titulo: string; descripcion?: string; accion?: ReactNode };
  error?: { titulo?: string; descripcion?: string; onReintentar?: () => void };
};

type Props = {
  state: EstadoPantalla;
  variante: VarianteLoading;
  textos?: TextosEstado;
  children: ReactNode;
};

/** Resuelve los cuatro estados estándar; en `ready` renderiza el contenido. */
export function Estado({ state, variante, textos, children }: Props) {
  if (state === "loading") return <Loading variante={variante} />;
  if (state === "forbidden") return <Forbidden />;
  if (state === "error") {
    const e = textos?.error;
    return (
      <ErrorState
        titulo={e?.titulo ?? "No pudimos cargar esta información"}
        descripcion={e?.descripcion ?? "Revisa tu conexión e inténtalo de nuevo."}
        {...(e?.onReintentar
          ? {
              accion: (
                <Button variant="secondary" onClick={e.onReintentar}>
                  Reintentar
                </Button>
              ),
            }
          : {})}
      />
    );
  }
  if (state === "empty") {
    const v = textos?.vacio;
    return (
      <Empty
        titulo={v?.titulo ?? "Aún no hay registros"}
        {...(v?.descripcion ? { descripcion: v.descripcion } : {})}
        {...(v?.accion ? { accion: v.accion } : {})}
      />
    );
  }
  return <>{children}</>;
}

export type CabeceraProps = {
  titulo: string;
  subtitulo?: ReactNode;
  /** Línea sobre el título: badge de estado y texto corto (detalle). */
  sobre?: ReactNode;
  acciones?: ReactNode;
  /** Mostrar el título también en md+ (pantallas sin barra superior propia, como paneles de detalle). */
  tituloSiempre?: boolean;
  /** Título de detalle (22/28) en vez del de página (28/34). */
  tituloDetalle?: boolean;
  /** Toda la cabecera solo en teléfono (el subtítulo también es solo de teléfono). */
  soloTelefono?: boolean;
};

/**
 * Cabecera de página. En teléfono muestra el título (28/34); en iPad y desktop el título vive en
 * la barra superior del shell, así que aquí quedan sobre-línea, subtítulo y acciones.
 */
export function Cabecera(props: CabeceraProps) {
  const { titulo, subtitulo, sobre, acciones, tituloSiempre, tituloDetalle } = props;
  return (
    <div
      className={cn(
        "mb-4 flex items-start justify-between gap-x-3 gap-y-2",
        props.soloTelefono && "md:hidden",
      )}
    >
      <div className="min-w-0">
        {sobre ? (
          <div className="mb-1.5 flex items-center gap-2 text-sm text-fg-muted">{sobre}</div>
        ) : null}
        <h2
          className={cn(
            tituloDetalle ? "t-heading" : "t-title",
            "text-fg",
            !tituloSiempre && "md:hidden",
          )}
        >
          {titulo}
        </h2>
        {subtitulo ? <p className="mt-0.5 text-base text-fg-muted">{subtitulo}</p> : null}
      </div>
      {acciones ? (
        <div className={cn("flex shrink-0 items-center gap-2", !tituloSiempre && "md:hidden")}>
          {acciones}
        </div>
      ) : null}
    </div>
  );
}
