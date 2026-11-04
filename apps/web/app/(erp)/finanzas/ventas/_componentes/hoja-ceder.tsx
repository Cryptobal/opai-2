"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

type Simulacion = { anticipo: number; merma: number; saldoFactor: number; netoAlCeder: number };

/** Cesión de la factura a un factor: primero se simula, luego se cede. */
export function HojaCeder({
  documentoId,
  abierta,
  onCerrar,
}: {
  documentoId: string;
  abierta: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [factorRut, setFactorRut] = useState("");
  const [factorNombre, setFactorNombre] = useState("");
  const [factorEmail, setFactorEmail] = useState("");
  const [factorDireccion, setFactorDireccion] = useState("");
  const [tasa, setTasa] = useState("250");
  const [sim, setSim] = useState<Simulacion | null>(null);
  const [intento] = useState(() => crypto.randomUUID());
  const entrada = {
    documentoId,
    factorRut: factorRut.trim(),
    ...(factorNombre.trim() ? { factorNombre: factorNombre.trim() } : {}),
    ...(factorEmail.trim() ? { factorEmail: factorEmail.trim() } : {}),
    ...(factorDireccion.trim() ? { factorDireccion: factorDireccion.trim() } : {}),
    tasaBps: Number(tasa),
  };
  const valido = factorRut.trim().length >= 3 && Number(tasa) >= 0 && Number(tasa) <= 10_000;

  async function simular() {
    limpiarError();
    setSim(await ejecutar<Simulacion>("finanzas.ventas.cesion_simular", entrada, false, "ninguna"));
  }

  async function ceder() {
    limpiarError();
    const r = await ejecutar("finanzas.ventas.cesion_ceder", entrada, false, "layout", `cesion-${documentoId}-${intento}`);
    if (!r) return;
    avisar.exito("Cesión registrada");
    onCerrar();
  }

  return (
    <Sheet
      abierto={abierta}
      onCerrar={onCerrar}
      titulo="Ceder factura"
      descripcion="Simula el anticipo antes de enviar la cesión al factor."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button variant="secondary" disabled={pendiente || !valido} onClick={() => void simular()}>Simular</Button>
          <Button disabled={pendiente || !valido || !sim} onClick={() => void ceder()}>Ceder</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo="No se pudo completar">{error}</Alerta> : null}
        <Campo etiqueta="RUT del factor" htmlFor="ced-rut">
          <Input id="ced-rut" value={factorRut} onChange={(e) => { setFactorRut(e.target.value); setSim(null); }} />
        </Campo>
        <Campo etiqueta="Nombre del factor" htmlFor="ced-nombre">
          <Input id="ced-nombre" value={factorNombre} maxLength={120} onChange={(e) => setFactorNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Correo del factor" htmlFor="ced-email" ayuda="Lo exige Octava para registrar la cesión.">
          <Input id="ced-email" type="email" value={factorEmail} maxLength={40} onChange={(e) => setFactorEmail(e.target.value)} />
        </Campo>
        <Campo etiqueta="Dirección del factor" htmlFor="ced-dir">
          <Input id="ced-dir" value={factorDireccion} maxLength={70} onChange={(e) => setFactorDireccion(e.target.value)} />
        </Campo>
        <Campo etiqueta="Tasa (puntos base)" htmlFor="ced-tasa" ayuda="250 = 2,5 %.">
          <Input id="ced-tasa" inputMode="numeric" value={tasa} onChange={(e) => { setTasa(e.target.value.replace(/\D/g, "")); setSim(null); }} />
        </Campo>
        {sim ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-fg-muted">Anticipo</dt><dd className="tabular-nums text-right">{pesos(sim.anticipo)}</dd>
            <dt className="text-fg-muted">Merma</dt><dd className="tabular-nums text-right">{pesos(sim.merma)}</dd>
            <dt className="text-fg-muted">Saldo del factor</dt><dd className="tabular-nums text-right">{pesos(sim.saldoFactor)}</dd>
            <dt className="text-fg-muted">Neto al ceder</dt><dd className="tabular-nums text-right font-medium">{pesos(sim.netoAlCeder)}</dd>
          </dl>
        ) : null}
      </div>
    </Sheet>
  );
}
