"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, InputFecha, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { TIPOS_AUSENCIA } from "./tipos";

type Plan = {
  dias: number;
  puestos: { puestoId: string; puesto: string; instalacion: string; dias: number }[];
};

/**
 * Registrar un permiso, licencia, vacaciones o ausencia desde la ficha (ADR-094, adenda CAR-311 d; CAR-393): queda en
 * el registro de la persona. Con Pauta, la vista previa muestra qué turnos marca, y solo después se confirma.
 */
export function HojaRegistrarAusencia({
  personaId,
  nombre,
  hoy,
  conPauta,
}: {
  personaId: string;
  nombre: string;
  hoy: string;
  conPauta: boolean;
}) {
  const { abierta, cerrar } = useHojaUrl("registrar");
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [tipo, setTipo] = useState<string>("licencia");
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [motivo, setMotivo] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  if (!abierta) return null;
  const fechasMal = hasta < desde;
  const entrada = { personaId, tipo, motivo: motivo.trim(), desde, hasta };
  const salir = () => {
    setPlan(null);
    setMotivo("");
    setDesde(hoy);
    setHasta(hoy);
    limpiarError();
    cerrar();
  };
  const cambiar =
    <T,>(f: (v: T) => void) =>
    (v: T) => {
      f(v);
      setPlan(null);
      limpiarError();
    };

  async function revisar() {
    setPlan(await ejecutar<Plan>("core.ausencias.registrar", entrada, true, "ninguna"));
  }
  async function confirmar() {
    if (await ejecutar("core.ausencias.registrar", entrada)) {
      avisar.exito(
        plan && plan.dias > 0 ? "Quedó registrado y marcado en la pauta" : "Quedó registrado",
      );
      salir();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={salir}
      titulo="Registrar permiso o licencia"
      descripcion={
        conPauta
          ? `${nombre}. Si tiene turnos en esas fechas, quedan por cubrir en la pauta con este motivo.`
          : nombre
      }
      acciones={
        <>
          <Button variant="secondary" onClick={salir}>
            Cancelar
          </Button>
          {plan ? (
            <Button onClick={confirmar} disabled={pendiente}>
              {plan.dias === 0
                ? "Registrar"
                : `Registrar ${plan.dias === 1 ? "1 turno" : `${plan.dias} turnos`}`}
            </Button>
          ) : (
            <Button onClick={revisar} disabled={pendiente || fechasMal || motivo.trim().length < 3}>
              {conPauta ? "Ver turnos afectados" : "Revisar"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Tipo" htmlFor="aus-tipo">
          <Select
            id="aus-tipo"
            valor={tipo}
            onCambiar={cambiar(setTipo)}
            opciones={TIPOS_AUSENCIA}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Desde" htmlFor="aus-desde">
            <InputFecha
              id="aus-desde"
              valor={desde}
              onCambiar={cambiar((v: string) => v && setDesde(v))}
            />
          </Campo>
          <Campo
            etiqueta="Hasta"
            htmlFor="aus-hasta"
            {...(fechasMal ? { error: "No puede ser antes de «Desde»." } : {})}
          >
            <InputFecha
              id="aus-hasta"
              valor={hasta}
              onCambiar={cambiar((v: string) => v && setHasta(v))}
            />
          </Campo>
        </div>
        <Campo
          etiqueta="Motivo"
          htmlFor="aus-motivo"
          ayuda="Sin diagnósticos ni datos médicos: basta el folio o una frase."
        >
          <Input
            id="aus-motivo"
            value={motivo}
            placeholder="Licencia folio 12345"
            onChange={(e) => cambiar(setMotivo)(e.target.value)}
          />
        </Campo>
        {plan && plan.dias === 0 ? (
          <Alerta tono="info" titulo="Queda solo el registro">
            {conPauta ? "No tiene turnos en la pauta en esas fechas." : "Lista para registrar."}
          </Alerta>
        ) : plan ? (
          <Alerta
            tono="info"
            titulo={
              plan.dias === 1 ? "1 turno queda por cubrir" : `${plan.dias} turnos quedan por cubrir`
            }
          >
            {plan.puestos.map((p) => `${p.instalacion} · ${p.puesto}: ${p.dias}`).join(" · ")}
          </Alerta>
        ) : null}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
    </Sheet>
  );
}
