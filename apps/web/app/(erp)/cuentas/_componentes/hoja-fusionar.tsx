"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Checkbox, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { CompararFusion, ElegirDuplicado, PasosFusion, ResumenFusion, type Previa } from "./fusion-pasos";

/**
 * «Fusionar cuentas» (CuentaV2 · fusionar): Elegir → Comparar → Resumen → Fusionar. Cada paso pide la
 * vista previa de `core.cuentas.fusionar`, que ya trae los bloqueos (facturas, correos repetidos).
 */
export function HojaFusionar({ cuenta }: { cuenta: CuentaDetalle }) {
  const hoja = useHojaUrl("fusionar");
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [paso, setPaso] = useState(0);
  const [duplicado, setDuplicado] = useState<{ id: string; nombre: string } | null>(null);
  const [elegir, setElegir] = useState<Record<string, "esta" | "duplicado">>({});
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [entiendo, setEntiendo] = useState(false);

  const entrada = (e = elegir) => ({ cuentaId: cuenta.id, duplicadoId: duplicado?.id, elegir: e });
  async function verPrevia(siguiente: number, e = elegir) {
    const r = await ejecutar<Previa>("core.cuentas.fusionar", entrada(e), true, "ninguna");
    if (!r) return;
    setPrevia(r);
    setElegir(Object.fromEntries(r.comparacion.map((c) => [c.campo, c.queda])));
    setPaso(siguiente);
  }
  async function fusionar() {
    if (!(await ejecutar("core.cuentas.fusionar", entrada()))) return;
    avisar.exito(`${duplicado?.nombre ?? "El duplicado"} se fusionó en ${cuenta.nombre}`);
    hoja.cerrar();
  }
  const atras = () => {
    limpiarError();
    setPaso(paso - 1);
  };

  const acciones =
    paso === 0 ? (
      <>
        <Button variant="secondary" onClick={hoja.cerrar}>Cancelar</Button>
        <Button disabled={!duplicado || pendiente} onClick={() => void verPrevia(1)}>Comparar</Button>
      </>
    ) : paso === 1 ? (
      <>
        <Button variant="secondary" onClick={atras}>Atrás</Button>
        <Button disabled={pendiente} onClick={() => void verPrevia(2)}>Revisar resumen</Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={atras}>Atrás</Button>
        <Button variant="destructive" disabled={!entiendo || pendiente} onClick={() => void fusionar()}>
          Fusionar
        </Button>
      </>
    );

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Fusionar cuentas"
      descripcion={`${cuenta.nombre} con un duplicado`}
      acciones={acciones}
    >
      <div className="flex flex-col gap-4">
        <PasosFusion actual={paso} />
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {paso === 0 ? (
          <ElegirDuplicado cuenta={cuenta} elegido={duplicado} onElegir={setDuplicado} />
        ) : null}
        {paso === 1 && previa ? (
          <CompararFusion previa={previa} elegir={elegir} onElegir={(campo, lado) => setElegir({ ...elegir, [campo]: lado })} />
        ) : null}
        {paso === 2 && previa ? (
          <>
            <ResumenFusion previa={previa} queda={cuenta.nombre} duplicado={duplicado?.nombre ?? ""} />
            <Checkbox marcado={entiendo} onCambiar={setEntiendo} etiqueta="Entiendo que es irreversible" />
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
