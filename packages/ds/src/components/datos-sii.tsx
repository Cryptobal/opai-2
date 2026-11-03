import { CheckCircle2, CircleAlert } from "lucide-react";

import { Alerta } from "../acceso/alerta";
import { cn } from "../cn";
import { ErrorState } from "../states";
import { Badge } from "./badge";
import { Button } from "./button";
import { Segmentado } from "./segmentado";
import { Skeleton } from "./skeleton";

export type CampoDatosSii = {
  campo: string;
  etiqueta: string;
  ficha: string | null;
  sii: string | null;
  estado: "igual" | "distinto" | "vacio_ficha" | "vacio_sii";
};

export type EstadoDatosSii =
  | { tipo: "cargando" }
  | { tipo: "error"; titulo: string; mensaje: string; onReintentar?: () => void }
  | { tipo: "sin_inicio"; mensaje: string }
  | { tipo: "no_configurado"; mensaje: string }
  | { tipo: "ok"; campos: readonly CampoDatosSii[]; lista: boolean; resumen: string };

const BADGE: Record<
  CampoDatosSii["estado"],
  { tono: "success" | "warning" | "neutro"; texto: string }
> = {
  igual: { tono: "success", texto: "Igual" },
  distinto: { tono: "warning", texto: "Distinto" },
  vacio_ficha: { tono: "neutro", texto: "Vacío" },
  vacio_sii: { tono: "neutro", texto: "Sin dato" },
};

/** Campo que se puede elegir: el SII trae un valor que no está o difiere de la ficha. */
export const campoElegible = (c: CampoDatosSii) =>
  c.estado === "distinto" || c.estado === "vacio_ficha";

/**
 * Resultado de la consulta al SII por RUT (DESIGN-PROMPT-comercial-cierre §2, CuentaV2 · sii):
 * compara «En la ficha» con «En el SII» por campo, con «Aplicar el del SII» o «Mantener lo mío», y
 * el indicador «Lista para facturar». Controlado: la elección vive en quien lo usa.
 */
export function DatosSii(p: {
  estado: EstadoDatosSii;
  elegidos: ReadonlySet<string>;
  onElegir: (campo: string, aplicar: boolean) => void;
}) {
  const e = p.estado;
  if (e.tipo === "cargando")
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="t-body-sm text-fg-muted">Consultando al SII…</span>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  if (e.tipo === "error")
    return (
      <ErrorState
        titulo={e.titulo}
        descripcion={e.mensaje}
        accion={
          e.onReintentar ? (
            <Button variant="secondary" onClick={e.onReintentar}>
              Reintentar
            </Button>
          ) : undefined
        }
      />
    );
  if (e.tipo === "sin_inicio")
    return (
      <Alerta tono="warning" titulo="Contribuyente sin inicio de actividades">
        {e.mensaje}
      </Alerta>
    );
  if (e.tipo === "no_configurado")
    return (
      <Alerta tono="info" titulo="Consulta al SII no configurada">
        {e.mensaje}
      </Alerta>
    );
  const cambian = e.campos.filter((c) => campoElegible(c) && p.elegidos.has(c.campo)).length;
  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className={cn(
          "flex items-center gap-2 rounded-md p-3 t-body-sm font-medium",
          e.lista ? "bg-success-muted text-success-fg" : "bg-warning-muted text-warning-fg",
        )}
      >
        {e.lista ? (
          <CheckCircle2 className="size-4 flex-none" aria-hidden />
        ) : (
          <CircleAlert className="size-4 flex-none" aria-hidden />
        )}
        <span>{e.resumen}</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {e.campos.map((c) => {
          const b = BADGE[c.estado];
          return (
            <li key={c.campo} className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="t-body-sm font-semibold">{c.etiqueta}</span>
                <Badge tono={b.tono}>{b.texto}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="t-caption">En la ficha</span>
                  <span className="t-body-sm break-words">{c.ficha ?? "—"}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="t-caption">En el SII</span>
                  <span className="t-body-sm break-words">{c.sii ?? "—"}</span>
                </span>
              </div>
              {campoElegible(c) ? (
                <Segmentado
                  etiqueta={c.etiqueta}
                  activa={p.elegidos.has(c.campo) ? "sii" : "mio"}
                  opciones={[
                    {
                      id: "sii",
                      etiqueta: "Aplicar el del SII",
                      onClick: () => p.onElegir(c.campo, true),
                    },
                    {
                      id: "mio",
                      etiqueta: "Mantener lo mío",
                      onClick: () => p.onElegir(c.campo, false),
                    },
                  ]}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="t-caption">
        Vista previa: {cambian === 1 ? "cambia 1 campo" : `cambian ${cambian} campos`} al aplicar.
        El resto queda como está.
      </p>
    </div>
  );
}
