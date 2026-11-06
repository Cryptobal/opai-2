"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DIAS_PRUEBA_GRATIS, finDePruebaGratis } from "@opai/domain";
import { Alerta, avisar, Button, Checkbox, Campo, InputFecha, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { ModuloCobro } from "../../../facturacion/_componentes/cobro";

/** Hoja para abrir una prueba de un módulo hasta una fecha (se descarga al abrirla). */
export function HojaPrueba(props: { tenantId: string; modulo: ModuloCobro; onCerrar: () => void }) {
  const { tenantId, modulo, onCerrar } = props;
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [hasta, setHasta] = useState(
    modulo.condicion?.pruebaHasta ?? finDePruebaGratis(new Date().toISOString().slice(0, 10)),
  );
  const [pasa, setPasa] = useState(modulo.condicion?.pasaACobro ?? false);

  async function abrir() {
    const r = await ejecutar("platform.cobros.prueba_abrir", {
      tenantId,
      moduloId: modulo.moduloId,
      pruebaHasta: hasta,
      pasaACobro: pasa,
    });
    if (r) {
      avisar.exito("Prueba abierta");
      router.refresh();
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`Abrir prueba de ${modulo.nombre}`}
      descripcion={`La empresa usa el módulo hasta la fecha (por defecto ${DIAS_PRUEBA_GRATIS} días desde hoy). Siete días antes, Plataforma recibe un aviso.`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !hasta} onClick={() => void abrir()}>
            Abrir prueba
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Último día de la prueba" htmlFor="prueba-hasta">
          <InputFecha id="prueba-hasta" valor={hasta} onCambiar={setHasta} />
        </Campo>
        <Checkbox
          marcado={pasa}
          onCambiar={setPasa}
          etiqueta="Pasa a cobro al vencer"
          descripcion="Sin marcar, al vencer el módulo queda en solo lectura: se ve y se lee, no se borra nada."
        />
      </div>
    </Sheet>
  );
}
