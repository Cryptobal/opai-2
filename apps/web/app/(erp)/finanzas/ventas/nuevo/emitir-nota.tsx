"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alerta, avisar, Button, Campo, Card, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import type { Venta } from "../_componentes/tipos";
import { CamposNota } from "./campos-nota";

const etiquetaDoc = (v: Venta) =>
  `${v.tipoDte} · folio ${v.folio ?? "s/f"} · ${pesos(v.montoTotal)}${v.fechaEmision ? ` · ${v.fechaEmision}` : ""}`;

/**
 * Nota de crédito (61, sobre una factura del cliente) o de débito (56, sobre una nota de crédito del cliente):
 * la persona elige el documento a corregir, revisa con la vista previa y emite. Sin borrador: la nota se emite directo.
 */
export function EmitirNota({ tipo, cuentaId }: { tipo: "61" | "56"; cuentaId: string | null }) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [docs, setDocs] = useState<Venta[] | null>(null);
  const [origenId, setOrigenId] = useState("");
  const [codigo, setCodigo] = useState("1");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [vista, setVista] = useState<Venta | null>(null);
  const [intento] = useState(() => crypto.randomUUID());
  const esNc = tipo === "61";

  useEffect(() => {
    if (!cuentaId) return;
    let cancelar = false;
    const tipos = esNc ? [33, 34] : [61];
    void Promise.all(
      tipos.map((t) =>
        ejecutar<{ items: Venta[] }>("finanzas.ventas.listar", {
          cuentaId,
          tipoDte: t,
          soloEmitidos: true,
          limite: 100,
        }),
      ),
    ).then((rs) => {
      if (!cancelar)
        setDocs(rs.flatMap((r) => r?.items ?? []).filter((d) => d.estadoDte !== "anulado_nc"));
    });
    return () => {
      cancelar = true;
    };
  }, [cuentaId, esNc, ejecutar]);

  const origen = docs?.find((d) => d.id === origenId);
  const valor = Number(monto);
  const motivoOk = motivo.trim().length >= 3;
  const montoOk =
    !esNc || (Number.isInteger(valor) && valor > 0 && valor <= (origen?.montoTotal ?? 0));
  const listo = Boolean(origen) && motivoOk && montoOk;
  const input = useMemo(
    () =>
      esNc
        ? {
            documentoReferenciaId: origenId,
            monto: valor,
            motivo: motivo.trim(),
            codigoReferencia: Number(codigo),
          }
        : { notaCreditoId: origenId, motivo: motivo.trim() },
    [esNc, origenId, valor, motivo, codigo],
  );

  async function revisar() {
    limpiarError();
    const r = esNc
      ? await ejecutar<Venta>("finanzas.ventas.emitir_nota_credito", input, true)
      : await ejecutar<Venta>("finanzas.ventas.emitir_nota_debito", input, true);
    if (r) setVista(r);
  }

  async function emitir() {
    limpiarError();
    const clave = `${tipo}-${origenId}-${intento}`;
    const r = esNc
      ? await ejecutar<Venta>("finanzas.ventas.emitir_nota_credito", input, false, "layout", clave)
      : await ejecutar<Venta>("finanzas.ventas.emitir_nota_debito", input, false, "layout", clave);
    if (!r) return;
    avisar.exito(esNc ? "Nota de crédito emitida" : "Nota de débito emitida");
    router.push(`/finanzas/ventas/${r.id}`);
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="t-label text-fg">
        {esNc ? "Factura que corrige" : "Nota de crédito que anula"}
      </h2>
      {error ? (
        <Alerta tono="danger" titulo="No se pudo completar">
          {error}
        </Alerta>
      ) : null}
      {!cuentaId ? <p className="text-sm text-fg-muted">Elige primero el cliente.</p> : null}
      {docs && docs.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {esNc
            ? "Este cliente no tiene facturas emitidas para corregir."
            : "Este cliente no tiene notas de crédito emitidas para anular."}
        </p>
      ) : null}
      {docs && docs.length > 0 ? (
        <Campo etiqueta={esNc ? "Factura" : "Nota de crédito"} htmlFor="nota-origen">
          <Select
            id="nota-origen"
            valor={origenId}
            onCambiar={(v) => {
              setOrigenId(v);
              setVista(null);
              setMonto(String(docs.find((d) => d.id === v)?.montoTotal ?? ""));
            }}
            opciones={docs.map((d) => ({ valor: d.id, etiqueta: etiquetaDoc(d) }))}
          />
        </Campo>
      ) : null}
      {origen ? (
        <CamposNota
          esNc={esNc}
          total={origen.montoTotal}
          codigo={codigo}
          setCodigo={setCodigo}
          monto={monto}
          setMonto={(v) => {
            setMonto(v);
            setVista(null);
          }}
          montoOk={montoOk}
          motivo={motivo}
          setMotivo={(v) => {
            setMotivo(v);
            setVista(null);
          }}
          motivoOk={motivoOk}
        />
      ) : null}
      {vista ? (
        <Alerta tono="info" titulo="Vista previa">
          {esNc ? "Nota de crédito" : "Nota de débito"} por {pesos(vista.montoTotal)} sobre{" "}
          {origen ? etiquetaDoc(origen) : "el documento elegido"}. Al emitir se asigna folio y se
          firma; no se puede deshacer.
        </Alerta>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={pendiente || !listo} onClick={() => void revisar()}>
          Revisar
        </Button>
        <Button disabled={pendiente || !listo || !vista} onClick={() => void emitir()}>
          {esNc ? "Emitir nota de crédito" : "Emitir nota de débito"}
        </Button>
      </div>
    </Card>
  );
}
