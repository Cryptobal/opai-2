import { Alerta, Button, Empty, Segmentado, Table, Th } from "@opai/ds";

import { FilaMovimientoMiDt } from "./lista-cumplimiento-dt-fila";
import type { MovimientoMiDt } from "./lista-cumplimiento-dt";

type Props = {
  items: MovimientoMiDt[];
  pendientes: number;
  gestiona: boolean;
  pendienteCap: boolean;
  seg: "pen" | "reg";
  setSeg: (s: "pen" | "reg") => void;
  filas: MovimientoMiDt[];
  variante: "contratos" | "finiquitos";
  onExportar: () => void;
  onDatos: (m: MovimientoMiDt) => void;
  onMarcar: (m: MovimientoMiDt) => void;
};

/** Toolbar y tabla de la lista Mi DT. */
export function ListaCumplimientoDtCuerpo(p: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Alerta tono="info" titulo="Plazo de 15 días desde el hecho · Ley 21.327">
        El registro en Mi DT lo hace el representante laboral electrónico. OPAI prepara los datos, sigue el plazo y guarda el comprobante que subas.
      </Alerta>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          etiqueta="Estado del registro"
          activa={p.seg}
          opciones={[
            { id: "pen", etiqueta: `Por registrar · ${p.pendientes}`, onClick: () => p.setSeg("pen") },
            { id: "reg", etiqueta: "Registrados", onClick: () => p.setSeg("reg") },
          ]}
        />
        {p.gestiona && p.seg === "pen" ? (
          <Button variant="secondary" disabled={p.pendienteCap || p.pendientes === 0} onClick={p.onExportar}>
            Descargar pendientes
          </Button>
        ) : null}
      </div>
      {p.filas.length === 0 ? (
        <Empty titulo={p.seg === "pen" ? "Sin pendientes" : "Sin registrados"} descripcion="Cambia de segmento para ver el otro estado." />
      ) : (
        <Table aria-label="Movimientos Mi DT">
          <thead>
            <tr>
              <Th>Movimiento</Th>
              <Th>Persona</Th>
              <Th>Hecho</Th>
              <Th>{p.seg === "pen" ? "Plazo Mi DT" : "Registro"}</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {p.filas.map((m) => (
              <FilaMovimientoMiDt
                key={m.clave}
                m={m}
                seg={p.seg}
                variante={p.variante}
                gestiona={p.gestiona}
                pendiente={p.pendienteCap}
                onDatos={p.onDatos}
                onMarcar={p.onMarcar}
              />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}