"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Card, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import type { Venta } from "../_componentes/tipos";
import { CamposNdCargo } from "./campos-nd-cargo";
import { BloqueEmisionGuardada, EmitirDialogos } from "./emitir-secciones";
import { useEmision } from "./use-emision";

const etiquetaFactura = (v: Venta) =>
  `${v.tipoDte} · folio ${v.folio ?? "s/f"} · ${pesos(v.montoTotal)}${v.fechaEmision ? ` · ${v.fechaEmision}` : ""}`;

/**
 * Nota de débito de cargo sobre una factura emitida (CAR-234): se elige la factura, el motivo y el monto del cargo; se
 * guarda como borrador y se revisa y emite con el mismo flujo de la factura (folio del CAF 56, vista previa).
 */
export function EmitirNdCargo({ cuentaId }: { cuentaId: string | null }) {
  const { ejecutar, pendiente, error, codigo, limpiarError } = useCapacidad("erp");
  const [facturas, setFacturas] = useState<Venta[] | null>(null);
  const [facturaId, setFacturaId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [vista, setVista] = useState<Venta | null>(null);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"borrador" | "emitir" | null>(null);
  const emision = useEmision({ ejecutar, codigo, documentoId, setDialogo });

  useEffect(() => {
    if (!cuentaId) return;
    let cancelar = false;
    void Promise.all(
      [33, 34].map((t) =>
        ejecutar<{ items: Venta[] }>("finanzas.ventas.listar", {
          cuentaId,
          tipoDte: t,
          soloEmitidos: true,
          limite: 100,
        }),
      ),
    ).then((rs) => {
      if (!cancelar)
        setFacturas(rs.flatMap((r) => r?.items ?? []).filter((d) => d.estadoDte !== "anulado_nc"));
    });
    return () => {
      cancelar = true;
    };
  }, [cuentaId, ejecutar]);

  const factura = facturas?.find((f) => f.id === facturaId);
  const valor = Number(monto);
  const listo =
    Boolean(factura) &&
    motivo.trim().length >= 3 &&
    detalle.trim().length > 0 &&
    Number.isInteger(valor) &&
    valor > 0;
  const input = {
    facturaId,
    motivo: motivo.trim(),
    lineas: [{ glosa: detalle.trim(), monto: valor }],
  };
  const cambiar = (f: (v: string) => void) => (v: string) => {
    f(v);
    setVista(null);
  };

  async function revisar() {
    limpiarError();
    const r = await ejecutar<Venta>("finanzas.ventas.crear_borrador_nota_debito", input, true);
    if (r) setVista(r);
  }
  async function guardar() {
    limpiarError();
    const r = await ejecutar<Venta>("finanzas.ventas.crear_borrador_nota_debito", input, false);
    if (!r) return;
    setDocumentoId(r.id);
    avisar.exito("Borrador de nota de débito guardado");
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="t-label text-fg">Factura que recibe el cargo</h2>
      {error ? (
        <Alerta tono="danger" titulo="No se pudo completar">
          {error}
        </Alerta>
      ) : null}
      {emision.preflightBloqueante ? (
        <Alerta tono="warning" titulo="Falta algo para emitir">
          {emision.preflightBloqueante}
        </Alerta>
      ) : null}
      {!cuentaId ? <p className="text-sm text-fg-muted">Elige primero el cliente.</p> : null}
      {facturas && facturas.length === 0 ? (
        <p className="text-sm text-fg-muted">Este cliente no tiene facturas emitidas vigentes.</p>
      ) : null}
      {facturas && facturas.length > 0 ? (
        <Campo etiqueta="Factura" htmlFor="ndc-factura">
          <Select
            id="ndc-factura"
            disabled={Boolean(documentoId)}
            valor={facturaId}
            onCambiar={cambiar(setFacturaId)}
            opciones={facturas.map((f) => ({ valor: f.id, etiqueta: etiquetaFactura(f) }))}
          />
        </Campo>
      ) : null}
      {factura ? (
        <CamposNdCargo
          bloqueado={Boolean(documentoId)}
          exenta={factura.tipoDte === 34}
          motivo={motivo}
          setMotivo={cambiar(setMotivo)}
          detalle={detalle}
          setDetalle={cambiar(setDetalle)}
          monto={monto}
          setMonto={cambiar(setMonto)}
        />
      ) : null}
      {vista && !documentoId ? (
        <Alerta tono="info" titulo="Vista previa del borrador">
          Nota de débito por {pesos(vista.montoTotal)} sobre{" "}
          {factura ? etiquetaFactura(factura) : "la factura"}. Aún no tiene folio ni se envía al
          SII.
        </Alerta>
      ) : null}
      {documentoId ? (
        <BloqueEmisionGuardada
          pendiente={pendiente}
          etiquetaEmitir="Emitir nota de débito"
          revisarEmision={() => void emision.revisarEmision()}
          emitir={() => void emision.emitir()}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={pendiente || !listo} onClick={() => void revisar()}>
            Revisar
          </Button>
          <Button disabled={pendiente || !listo || !vista} onClick={() => void guardar()}>
            Guardar borrador
          </Button>
        </div>
      )}
      <EmitirDialogos
        dialogo={dialogo}
        setDialogo={setDialogo}
        previewBorrador={null}
        previewEmitir={emision.previewEmitir}
        documentoId={documentoId}
        guardarBorrador={() => undefined}
        emitir={() => void emision.emitir()}
      />
    </Card>
  );
}
