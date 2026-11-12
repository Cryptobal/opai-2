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
}: {
  movimientos: MovimientoBanco[];
  gestiona: boolean;
  hrefMov: (id: string) => string;
}) {
  if (movimientos.length === 0) {
    return <Empty titulo="Sin movimientos con este filtro" descripcion="Importa una cartola o cambia el estado o el tipo." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {movimientos.map((m) => (
        <li key={m.id} className="rowcard flex flex-wrap items-center gap-2 p-3">
          <div className="min-w-0 flex-1">
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
          <span className={`t-mono t-body-sm ${m.monto >= 0 ? "text-success-fg" : "text-danger-fg"}`}>{clp(m.monto)}</span>
          <Badge tono={m.estado === "conciliado" ? "success" : m.estado === "por_autorizar" ? "warning" : "neutro"}>
            {ETIQUETA_ESTADO[m.estado] ?? m.estado}
          </Badge>
          {gestiona ? (
            <EnlaceBoton href={hrefMov(m.id)} variante="secondary">
              {m.estado === "conciliado" ? "Ver" : "Reconocer"}
            </EnlaceBoton>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
