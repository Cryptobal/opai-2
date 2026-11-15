"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { IvaCelda } from "./cobros-celda";
import { clp, fechaDdMmAaaa } from "./datos";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const mes = (periodo: string) =>
  `${MESES[Number(periodo.slice(5, 7)) - 1] ?? ""} ${periodo.slice(0, 4)}`;

type Vista = { periodo: string; postergado: boolean; cambio: boolean };

/** IVA a pagar de la semana: postergar su pago a M+2 o volverlo a M+1, con vista previa (CAR-397). */
export function HojaIva({
  semana,
  ivas,
  onCerrar,
}: {
  semana: string;
  ivas: IvaCelda[];
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [vista, setVista] = useState<Vista | null>(null);
  const iva = ivas[0];

  async function revisar(postergar: boolean) {
    if (!iva) return;
    limpiarError();
    setVista(
      await ejecutar<Vista>(
        "finanzas.flujo.postergar_iva",
        { periodo: iva.periodo, postergar },
        true,
        "ninguna",
      ),
    );
  }

  async function confirmar() {
    if (!vista) return;
    const r = await ejecutar<Vista>("finanzas.flujo.postergar_iva", {
      periodo: vista.periodo,
      postergar: vista.postergado,
    });
    if (!r) return;
    avisar.exito(
      r.postergado
        ? "IVA postergado al mes siguiente"
        : "El IVA vuelve a pagarse el mes siguiente a su declaración",
    );
    onCerrar();
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo="IVA a pagar"
      descripcion={`Semana ${fechaDdMmAaaa(semana)}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          {vista ? (
            <Button disabled={pendiente} onClick={() => void confirmar()}>
              {pendiente ? "Guardando…" : "Confirmar"}
            </Button>
          ) : iva ? (
            <Button disabled={pendiente} onClick={() => void revisar(!iva.postergado)}>
              {iva.postergado ? "Volver a pagarlo en M+1" : "Postergar a M+2"}
            </Button>
          ) : null}
        </>
      }
    >
      {iva ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-fg">IVA de {mes(iva.periodo)}</p>
            <p className="text-sm tabular-nums text-fg-muted">
              {clp(iva.monto)} · se paga el {fechaDdMmAaaa(iva.fechaPago)}
              {iva.postergado ? " (postergado a M+2)" : ""}
            </p>
          </div>
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          {vista ? (
            <Alerta tono="info" titulo="Revisa el cambio">
              {vista.postergado
                ? `El IVA de ${mes(vista.periodo)} pasa a pagarse dos meses después de su declaración (M+2). El PPM no se posterga.`
                : `El IVA de ${mes(vista.periodo)} vuelve a pagarse el mes siguiente a su declaración (M+1).`}
            </Alerta>
          ) : (
            <p className="text-sm text-fg-muted">
              Postergar mueve solo el pago del IVA de ese mes. Úsalo si la empresa se acoge a la
              postergación del IVA de ese mes.
            </p>
          )}
        </div>
      ) : null}
    </Sheet>
  );
}
