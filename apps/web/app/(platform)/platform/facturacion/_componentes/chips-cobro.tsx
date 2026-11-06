import { esParteFinanzas } from "@opai/domain";
import { Badge } from "@opai/ds";

import {
  clp,
  type EmpresaCobro,
  type ModuloCobro,
  TEXTO_INCLUIDO_EN_BASE,
  textoCantidad,
} from "./cobro";

export const contratado = (m: ModuloCobro) => m.estado === "activo" || m.estado === "trial";

/**
 * Módulos contratados o con condición: los demás no aportan a la vista. Lo incluido en el plan base
 * va aparte y una parte de Finanzas solo cuenta si tiene su propia condición.
 */
export const relevantes = (e: EmpresaCobro) =>
  e.modulos.filter(
    (m) => !m.incluidoEnBase && (m.condicion || (contratado(m) && !esParteFinanzas(m.moduloId))),
  );
export const incluidos = (e: EmpresaCobro) =>
  e.modulos.filter((m) => m.incluidoEnBase && contratado(m));
export const seFacturan = (e: EmpresaCobro) => relevantes(e).filter((m) => m.calculo.facturable);
export const noSeFacturan = (e: EmpresaCobro) => relevantes(e).filter((m) => !m.calculo.facturable);

export function ChipSeFactura({ m }: { m: ModuloCobro }) {
  const cant =
    m.calculo.cantidad !== null
      ? ` · ${textoCantidad(m.calculo.cantidad, m.condicion?.unidad ?? null)}`
      : "";
  return (
    <Badge tono="success" title={m.cargo ? "Cargo generado" : "Se factura este mes"}>
      {m.nombre}
      {cant} · {clp(m.cargo?.montoClp ?? m.calculo.montoClp)}
      {m.cargo ? " ✓" : ""}
    </Badge>
  );
}

export function ChipNoSeFactura({ m }: { m: ModuloCobro }) {
  return (
    <Badge
      tono={m.calculo.motivo === "en_prueba" ? "info" : "neutro"}
      title={m.calculo.motivoTexto}
    >
      {m.nombre} · {m.calculo.motivoTexto}
    </Badge>
  );
}

export function Grupo(props: { titulo: string; vacio: string; hijos: React.ReactNode[] }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="t-label-sm text-fg-muted">{props.titulo}</span>
      <span className="flex flex-wrap gap-1.5">
        {props.hijos.length ? props.hijos : <span className="t-caption">{props.vacio}</span>}
      </span>
    </span>
  );
}

export function ChipIncluido({ m }: { m: ModuloCobro }) {
  return (
    <Badge tono="info" title={TEXTO_INCLUIDO_EN_BASE}>
      {m.nombre}
    </Badge>
  );
}

export const grupos = (e: EmpresaCobro) => [
  <Grupo
    key="si"
    titulo="Se facturan"
    vacio="Nada este mes"
    hijos={seFacturan(e).map((m) => (
      <ChipSeFactura key={m.moduloId} m={m} />
    ))}
  />,
  <Grupo
    key="no"
    titulo="No se facturan"
    vacio="Todo se factura"
    hijos={noSeFacturan(e).map((m) => (
      <ChipNoSeFactura key={m.moduloId} m={m} />
    ))}
  />,
  ...(incluidos(e).length
    ? [
        <Grupo
          key="base"
          titulo={TEXTO_INCLUIDO_EN_BASE}
          vacio=""
          hijos={incluidos(e).map((m) => (
            <ChipIncluido key={m.moduloId} m={m} />
          ))}
        />,
      ]
    : []),
];
