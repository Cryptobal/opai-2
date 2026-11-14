import { Badge, Empty } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { clp, fechaDdMmAaaa } from "../../flujo/_componentes/datos";
import type { MovimientoBanco } from "./bancos-tipos";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Sin reconocer",
  sugerido: "Sugerido",
  por_autorizar: "Por autorizar",
  conciliado: "Conciliado",
  ignorado: "Ignorado",
};

/** Movimientos de la pestaña: abonos en verde y cargos en rojo, y dónde quedó conciliado cada uno (CAR-328). */
export function ListaMovimientos({
  movimientos,
  gestiona,
  hrefMov,
  seleccionado,
}: {
  movimientos: MovimientoBanco[];
  gestiona: boolean;
  hrefMov: (id: string) => string;
  /** Movimiento abierto en el panel derecho (CAR-257): se marca en la lista. */
  seleccionado?: string | undefined;
}) {
  if (movimientos.length === 0) {
    return <Empty titulo="Sin movimientos con este filtro" descripcion="Importa una cartola o cambia el estado o el tipo." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {movimientos.map((m) => (
        <li
          key={m.id}
          {...(m.id === seleccionado ? { "aria-current": "true" as const } : {})}
          className={`rowcard grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-3 ${m.id === seleccionado ? "ring-2 ring-accent" : ""}`}
        >
          {/* Dos columnas fijas (CAR-443): glosa y fecha a la izquierda y el monto alineado a la derecha; debajo, el estado
              y la acción. Mantiene el orden igual con la lista a todo el ancho o junto al panel (CAR-257). */}
          <div className="min-w-0">
            <p className="t-body-sm font-medium break-words">{m.glosa}</p>
            <p className="t-caption text-fg-muted">
              {fechaDdMmAaaa(m.fecha)}
              {m.referencia ? ` · ${m.referencia}` : ""}
            </p>
            {m.clasificacion ? (
              <p className="t-caption text-fg-muted">
                {m.regla ? `Regla «${m.regla}» · ` : ""}
                {m.clasificacion}
              </p>
            ) : null}
          </div>
          <span className={`self-start text-right t-mono t-body-sm tabular-nums ${m.monto >= 0 ? "text-success-fg" : "text-danger-fg"}`}>{clp(m.monto)}</span>
          <div>
            <Badge tono={m.estado === "conciliado" ? "success" : m.estado === "por_autorizar" ? "warning" : "neutro"}>
              {ETIQUETA_ESTADO[m.estado] ?? m.estado}
            </Badge>
          </div>
          {gestiona ? (
            <EnlaceBoton href={hrefMov(m.id)} variante="secondary" className="justify-self-end">
              {m.estado === "conciliado" ? "Ver" : "Reconocer"}
            </EnlaceBoton>
          ) : (
            <span />
          )}
        </li>
      ))}
    </ul>
  );
}
