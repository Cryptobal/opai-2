"use client";

import { useRouter } from "next/navigation";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";
import { DIAS_PRUEBA_GRATIS, extenderPruebaGratis, formatearFecha } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { PruebaGratisVista } from "./tipos-prueba";

type Salida = { hasta: string; reactivada: boolean };

/** Extiende (vigente) o reactiva (terminada) una prueba gratis por 10 días (CAR-222). */
export function HojaExtender(props: {
  tenantId: string;
  prueba: PruebaGratisVista;
  onCerrar: () => void;
}) {
  const { tenantId, prueba, onCerrar } = props;
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const reactiva = prueba.estado === "vencida";
  const hoy = new Date().toISOString().slice(0, 10);
  const nuevo = extenderPruebaGratis(prueba.hasta, hoy, DIAS_PRUEBA_GRATIS);

  async function aplicar() {
    const r = await ejecutar<Salida>("platform.cobros.prueba_gratis_extender", {
      tenantId,
      moduloId: prueba.moduloId,
      dias: DIAS_PRUEBA_GRATIS,
    });
    if (r) {
      avisar.exito(r.reactivada ? "Prueba reactivada" : "Prueba extendida");
      router.refresh();
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`${reactiva ? "Reactivar" : "Extender"} la prueba de ${prueba.nombre}`}
      descripcion="No crea precios ni cargos: solo le da a la empresa más días de uso gratis."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente} onClick={() => void aplicar()}>
            {reactiva ? "Reactivar" : "Extender"} {DIAS_PRUEBA_GRATIS} días
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <p className="t-body text-fg-muted">
          {reactiva
            ? `La prueba terminó el ${formatearFecha(prueba.hasta)}. Al reactivarla, el módulo vuelve a estar en prueba y dura hasta el ${formatearFecha(nuevo)}.`
            : `La prueba vigente termina el ${formatearFecha(prueba.hasta)}. Al extenderla, dura hasta el ${formatearFecha(nuevo)}.`}
        </p>
      </div>
    </Sheet>
  );
}
