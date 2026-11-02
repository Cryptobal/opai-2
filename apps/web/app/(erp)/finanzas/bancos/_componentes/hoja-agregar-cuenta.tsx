"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

const MAPEO_GENERICO = { fecha: "fecha", monto: "monto", glosa: "glosa" } as const;

export function HojaAgregarCuenta({
  abierta,
  onAbiertaChange,
}: {
  abierta: boolean;
  onAbiertaChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [banco, setBanco] = useState("");
  const [numero, setNumero] = useState("");
  const [formato, setFormato] = useState<"santander" | "generico">("generico");
  const idempotencyKey = useMemo(
    () => (banco && numero ? `cuenta-${banco}-${numero}` : ""),
    [banco, numero],
  );

  const entrada = () => ({
    banco: banco.trim(),
    numeroVisible: numero.trim(),
    moneda: "CLP" as const,
    ...(formato === "generico" ? { mapeoColumnas: { ...MAPEO_GENERICO } } : { mapeoColumnas: null }),
  });

  async function previsualizar() {
    return ejecutar("finanzas.bancos.guardar", entrada(), true);
  }

  async function guardar() {
    const prev = await previsualizar();
    if (!prev) return;
    const r = await ejecutar<{ id: string }>(
      "finanzas.bancos.guardar",
      entrada(),
      false,
      "layout",
      idempotencyKey,
    );
    if (!r) return;
    avisar.exito("Cuenta bancaria creada");
    onAbiertaChange(false);
    setBanco("");
    setNumero("");
    router.refresh();
  }

  const valido = banco.trim().length >= 2 && numero.trim().length >= 4;

  return (
    <Sheet
      abierto={abierta}
      onCerrar={() => onAbiertaChange(false)}
      titulo="Agregar cuenta"
      descripcion="Cuenta para importar cartolas Santander (XLSX) o CSV genérico con columnas fecha, monto y glosa."
      acciones={
        <>
          <Button variant="secondary" onClick={() => onAbiertaChange(false)}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !valido || !idempotencyKey} onClick={() => void guardar()}>
            Crear cuenta
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Banco" htmlFor="cuenta-banco">
          <Input
            id="cuenta-banco"
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            placeholder="Ej. BancoEstado"
            autoComplete="off"
          />
        </Campo>
        <Campo etiqueta="Número de cuenta (visible)" htmlFor="cuenta-numero">
          <Input
            id="cuenta-numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Últimos dígitos o número completo"
            inputMode="numeric"
            autoComplete="off"
          />
        </Campo>
        <Campo etiqueta="Formato de cartola" htmlFor="cuenta-formato">
          <Select
            id="cuenta-formato"
            valor={formato}
            onCambiar={(v) => setFormato(v as "santander" | "generico")}
            opciones={[
              { valor: "generico", etiqueta: "CSV genérico (fecha;monto;glosa)" },
              { valor: "santander", etiqueta: "Santander (XLSX)" },
            ]}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
