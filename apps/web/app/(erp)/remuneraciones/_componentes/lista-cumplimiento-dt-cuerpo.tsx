import { Alerta, Badge, Button, Empty, Segmentado, Table, Td, Th } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { MovimientoMiDt } from "./lista-cumplimiento-dt";

const ETIQUETA_MOV = { alta: "Alta", baja: "Baja", anexo: "Anexo", finiquito: "Finiquito" } as const;

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
              <tr key={m.clave}>
                <Td className="font-medium">{ETIQUETA_MOV[m.movimientoTipo]}</Td>
                <Td>
                  <span className="block">{m.personaNombre}</span>
                  <span className="t-mono t-caption text-fg-muted">{m.rut}</span>
                </Td>
                <Td className="text-fg-muted">{m.hechoTexto}</Td>
                <Td>
                  <Badge tono={m.plazoTono === "neutral" ? "neutro" : m.plazoTono} punto>
                    {m.plazoEtiqueta}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    {p.variante === "finiquitos" ? (
                      <EnlaceBoton href={`/remuneraciones/cumplimiento-dt/finiquitos/${m.referenciaId}`} variante="ghost">
                        Ver finiquito
                      </EnlaceBoton>
                    ) : null}
                    <Button variant="ghost" disabled={p.pendienteCap} onClick={() => p.onDatos(m)}>
                      Datos
                    </Button>
                    {p.gestiona && !m.registrado ? (
                      <Button variant="secondary" disabled={p.pendienteCap} onClick={() => p.onMarcar(m)}>
                        Marcar registrado
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}