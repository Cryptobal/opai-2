import { Alerta, Card, DetailScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { pesos } from "../../../_componentes/etiquetas";
import type { LineaLiquidacion, LiquidacionDetalle } from "../../../_componentes/tipos";

export const metadata = { title: "Liquidación" };

type Props = { params: Promise<{ id: string; liq: string }> };

function Bloque({ titulo, lineas, total }: { titulo: string; lineas: LineaLiquidacion[]; total: number }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <p className="t-label-sm text-fg-muted">{titulo}</p>
      {lineas.length === 0 ? <p className="t-caption text-fg-muted">Sin movimientos.</p> : null}
      {lineas.map((l) => (
        <div key={l.concepto} className="flex justify-between gap-4">
          <span className="t-body">{l.concepto}</span>
          <span className="t-numeric">{pesos(l.monto)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-border pt-2">
        <span className="t-body font-semibold">Total</span>
        <span className="t-numeric font-semibold">{pesos(total)}</span>
      </div>
    </Card>
  );
}

/** Liquidación de una persona (diseño 04): haberes, descuentos y líquido a pagar. */
export default function LiquidacionPersona({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Liquidación"
      ruta="/remuneraciones"
      cargar={async () => {
        const { id, liq } = await params;
        return { id, r: await ejecutarComoUsuario<LiquidacionDetalle>("erp", "nomina.liquidaciones.obtener", { id: liq }) };
      }}
      opciones={(d) => ({ volver: { href: `/remuneraciones/${d.id}/liquidaciones`, etiqueta: "Liquidaciones" } })}
    >
      {(d) => {
        if (!d.r.ok) return <DetailScreen state="error" titulo="Liquidación">{d.r.error.message}</DetailScreen>;
        const l = d.r.data;
        const sum = (x: LineaLiquidacion[]) => x.reduce((s, y) => s + y.monto, 0);
        const descuentos = [...l.detalle.descuentosLegales, ...l.detalle.otrosDescuentos];
        return (
          <DetailScreen state="ready" titulo={l.personaNombre || "Liquidación"} subtitulo={`${l.diasTrabajados} días trabajados`}>
            <div className="flex flex-col gap-4">
              {l.advertencias.map((a) => <Alerta key={a} tono="warning" titulo={a} />)}
              <div className="grid gap-4 lg:grid-cols-2">
                <Bloque titulo="Haberes" lineas={l.detalle.haberes} total={sum(l.detalle.haberes)} />
                <Bloque titulo="Descuentos" lineas={descuentos} total={sum(descuentos)} />
              </div>
              <Card className="flex items-center justify-between gap-4 p-4">
                <span className="t-title">Líquido a pagar</span>
                <span className="t-numeric t-title">{pesos(l.liquido)}</span>
              </Card>
              <p className="t-caption text-fg-muted">
                Imponible {pesos(l.imponible)} · Costo empresa {pesos(l.costoEmpresa)}
              </p>
            </div>
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
