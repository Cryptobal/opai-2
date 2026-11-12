import type { ReactNode } from "react";

import { cn } from "../cn";
import { Button } from "../components/button";
import { Empty, ErrorState, Forbidden, Loading, type VarianteLoading } from "../states";

export type EstadoPantalla = "loading" | "empty" | "error" | "forbidden" | "ready";

export type TextosEstado = {
  vacio?: { titulo: string; descripcion?: string; accion?: ReactNode };
  // `accion` para una pantalla de servidor (p. ej. `<BotonReintentar/>`, que recarga la página):
  // una función no cruza de un Server Component a este Client Component. `onReintentar` sigue
  // disponible para quien ya renderiza `Estado` en un árbol de cliente.
  error?: { titulo?: string; descripcion?: string; accion?: ReactNode; onReintentar?: () => void };
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
        {...(e?.accion
          ? { accion: e.accion }
          : e?.onReintentar
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
  /** Mostrar las acciones también en md+ sin mostrar el título (listas: la acción principal vive en el
   *  patrón, no en la cabecera del shell; Brief 05 §8.3 y REGLAS-codigo, UI). */
  accionesSiempre?: boolean;
  /** Mostrar el título también en md+ (pantallas sin barra superior propia, como paneles de detalle). */
  tituloSiempre?: boolean;
  /** Con `tituloSiempre`, el título es el mismo del shell: el marco Hilo ya lo muestra en el lienzo. */
  tituloComoShell?: boolean;
  /** Título de detalle (22/28) en vez del de página (28/34). */
  tituloDetalle?: boolean;
  /** Toda la cabecera solo en teléfono (el subtítulo también es solo de teléfono). */
  soloTelefono?: boolean;
  /** Teléfono: título y metadatos a ancho completo y acciones en fila aparte debajo (fichas CPQ). */
  accionesDebajoEnTelefono?: boolean;
};

/**
 * Cabecera de página. En teléfono muestra el título (28/34); en iPad y desktop el título vive en
 * la barra superior del shell, así que aquí quedan sobre-línea, subtítulo y acciones.
 */
export function Cabecera(props: CabeceraProps) {
  const { titulo, subtitulo, sobre, acciones, tituloSiempre, tituloDetalle } = props;
  const ocultarEnHilo = !tituloSiempre || props.tituloComoShell;
  const accionesVisibles = tituloSiempre || props.accionesSiempre;
  const apilada = props.accionesDebajoEnTelefono;
  return (
    <div
      className={cn(
        "mb-4 flex gap-x-3 gap-y-2",
        apilada ? "flex-col md:flex-row md:items-start md:justify-between" : "flex-wrap items-start justify-between",
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
            ocultarEnHilo && "marco-hilo:hidden",
          )}
        >
          {titulo}
        </h2>
        {subtitulo ? <p className="mt-0.5 text-base text-fg-muted">{subtitulo}</p> : null}
      </div>
      {acciones ? (
        <div
          className={cn(
            "flex max-w-full min-w-0 items-center gap-2",
            apilada ? "w-full shrink-0 md:w-auto" : "shrink-0",
            !accionesVisibles && "md:hidden",
          )}
        >
          {acciones}
        </div>
      ) : null}
    </div>
  );
}
