"use client";
import { useState } from "react";
import { Alerta, avisar, Button, Campo, InputFecha, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Tipo = "plazo_fijo" | "indefinido";

/**
 * Registra un período del contrato (CAR-409): una renovación de plazo fijo o el paso a indefinido.
 * Cada período queda en la historia del contrato; el vigente y los avisos se calculan desde ahí.
 */
export function HojaRegistrarPeriodo({
  personaId,
  inicioSugerido,
  soloIndefinido,
}: {
  personaId: string;
  /** Día siguiente al término del período anterior (o inicio del contrato). */
  inicioSugerido: string;
  /** Ya hay 3 períodos de plazo fijo: el siguiente solo puede ser indefinido. */
  soloIndefinido: boolean;
}) {
  const hoja = useHojaUrl("registrar-periodo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [tipo, setTipo] = useState<Tipo>(soloIndefinido ? "indefinido" : "plazo_fijo");
  const [inicio, setInicio] = useState(inicioSugerido);
  const [termino, setTermino] = useState("");
  const plazo = tipo === "plazo_fijo";
  const terminoMalo = plazo && termino !== "" && termino < inicio;
  const invalido = !inicio || (plazo && (!termino || terminoMalo));
  async function guardar() {
    const r = await ejecutar("core.personas.periodos_registrar", {
      id: personaId,
      tipo,
      inicio,
      termino: plazo ? termino : null,
    });
    if (!r) return;
    avisar.exito(plazo ? "Período de plazo fijo registrado" : "El contrato pasó a indefinido");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Registrar período del contrato"
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" disabled={pendiente} onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || invalido} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Registrar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" aria-busy={pendiente}>
        {error ? (
          <Alerta tono="danger" titulo="No se pudo registrar">
            {error}
          </Alerta>
        ) : null}
        <fieldset disabled={pendiente} className="flex flex-col gap-3.5">
          <Campo etiqueta="Tipo de período" htmlFor="periodo-tipo">
            <Select
              id="periodo-tipo"
              valor={tipo}
              onCambiar={(v) => setTipo(v === "indefinido" ? "indefinido" : "plazo_fijo")}
              opciones={[
                ...(soloIndefinido
                  ? []
                  : [{ valor: "plazo_fijo", etiqueta: "Plazo fijo (renovación)" }]),
                { valor: "indefinido", etiqueta: "Pasa a indefinido" },
              ]}
            />
          </Campo>
          <Campo etiqueta={plazo ? "Inicio" : "Indefinido desde"} htmlFor="periodo-inicio">
            <InputFecha id="periodo-inicio" valor={inicio} onCambiar={setInicio} />
          </Campo>
          {plazo ? (
            <Campo
              etiqueta="Término"
              htmlFor="periodo-termino"
              {...(terminoMalo ? { error: "Debe ser igual o posterior al inicio" } : {})}
            >
              <InputFecha id="periodo-termino" valor={termino} onCambiar={setTermino} />
            </Campo>
          ) : null}
        </fieldset>
      </div>
    </Sheet>
  );
}
