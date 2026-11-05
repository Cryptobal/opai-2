"use client";

import { useEffect, useState } from "react";

import { AFP } from "@opai/domain";
import { Alerta, Campo, Input, InputMonto, Select, Segmentado, SelectorHora } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import type { EstadoPuesto } from "./puesto-form";

type Cargo = { cargoId: string; cargo: string; sueldoBaseClp?: number | null };
const SIN = "__defecto";
const opc = (valor: string, etiqueta: string) => ({ valor, etiqueta });

export function CamposPuesto({
  e,
  set,
  verCostos,
}: {
  e: EstadoPuesto;
  set: (cambio: Partial<EstadoPuesto>) => void;
  verCostos: boolean;
}) {
  const { ejecutar } = useCapacidad("erp");
  const [cargos, setCargos] = useState<Cargo[]>([]);
  useEffect(() => {
    void ejecutar<{ items: Cargo[] }>("cpq.sueldos_referencia.list", {}, false, "ninguna").then(
      (r) => r && setCargos(r.items),
    );
  }, [ejecutar]);
  const cargo = cargos.find((c) => c.cargoId === e.cargoId);
  const ref = cargo?.sueldoBaseClp;
  const num = (k: keyof EstadoPuesto) => (v: string) => set({ [k]: v.replace(/\D/g, "") });
  const pref = (k: keyof EstadoPuesto, v: string) => set({ [k]: v === SIN ? "" : v });

  return (
    <div className="space-y-4 p-4">
      <Campo etiqueta="Nombre del puesto" htmlFor="cpq-p-nombre">
        <Input id="cpq-p-nombre" value={e.nombre} onChange={(x) => set({ nombre: x.target.value })} />
      </Campo>
      <Campo etiqueta="Posiciones" htmlFor="cpq-p-pos">
        <Input id="cpq-p-pos" inputMode="numeric" value={e.posiciones} onChange={(x) => num("posiciones")(x.target.value)} />
      </Campo>
      <Campo etiqueta="Cargo" htmlFor="cpq-p-cargo" ayuda="Trae el sueldo de referencia para cotizar.">
        <Select
          id="cpq-p-cargo"
          valor={e.cargoId || SIN}
          onCambiar={(v) => pref("cargoId", v)}
          opciones={[opc(SIN, "Sin cargo"), ...cargos.map((c) => opc(c.cargoId, c.cargo))]}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Patrón de turno" htmlFor="cpq-p-patron">
          <Input id="cpq-p-patron" placeholder="Ej. 4x4" value={e.patron} onChange={(x) => set({ patron: x.target.value })} />
        </Campo>
        <span />
        <Campo etiqueta="Entrada" htmlFor="cpq-p-hi">
          <SelectorHora id="cpq-p-hi" valor={e.horaInicio} onCambiar={(v) => set({ horaInicio: v })} />
        </Campo>
        <Campo etiqueta="Salida" htmlFor="cpq-p-hf">
          <SelectorHora id="cpq-p-hf" valor={e.horaFin} onCambiar={(v) => set({ horaFin: v })} />
        </Campo>
      </div>
      {verCostos ? (
        <>
          <Segmentado
            etiqueta="Tipo de sueldo"
            activa={e.modo}
            opciones={[
              { id: "bruto", etiqueta: "Bruto", onClick: () => set({ modo: "bruto" }) },
              { id: "liquido", etiqueta: "Líquido objetivo", onClick: () => set({ modo: "liquido" }) },
            ]}
          />
          {e.modo === "bruto" ? (
            <Campo
              etiqueta="Sueldo base (CLP)"
              htmlFor="cpq-p-sueldo"
              ayuda={ref != null ? `Vacío usa la referencia del cargo: ${pesos(ref)}.` : "Vacío deja el costo pendiente."}
            >
              <InputMonto id="cpq-p-sueldo" valor={e.sueldo} onCambiar={num("sueldo")} />
            </Campo>
          ) : (
            <Campo etiqueta="Líquido objetivo (CLP)" htmlFor="cpq-p-liq" ayuda="El bruto se calcula con el motor de costo empleador.">
              <InputMonto id="cpq-p-liq" valor={e.liquido} onCambiar={num("liquido")} />
            </Campo>
          )}
          {ref != null && e.modo === "bruto" && !e.sueldo ? (
            <Alerta tono="info" titulo="Sueldo de referencia: supuesto de venta, no lo que se paga." />
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Colación (CLP)" htmlFor="cpq-p-col" ayuda="Vacío usa el defecto.">
              <InputMonto id="cpq-p-col" valor={e.colacion} onCambiar={num("colacion")} />
            </Campo>
            <Campo etiqueta="Movilización (CLP)" htmlFor="cpq-p-mov" ayuda="Vacío usa el defecto.">
              <InputMonto id="cpq-p-mov" valor={e.movilizacion} onCambiar={num("movilizacion")} />
            </Campo>
          </div>
        </>
      ) : null}
      <Campo etiqueta="AFP" htmlFor="cpq-p-afp">
        <Select id="cpq-p-afp" valor={e.afp || SIN} onCambiar={(v) => pref("afp", v)}
          opciones={[opc(SIN, "Defecto de la empresa"), ...AFP.map((a) => opc(a, a))]} />
      </Campo>
      <Campo etiqueta="Salud" htmlFor="cpq-p-salud">
        <Select id="cpq-p-salud" valor={e.saludTipo || SIN} onCambiar={(v) => pref("saludTipo", v)}
          opciones={[opc(SIN, "Defecto de la empresa"), opc("fonasa", "Fonasa"), opc("isapre", "Isapre")]} />
      </Campo>
      {e.saludTipo === "isapre" ? (
        <Campo etiqueta="Plan Isapre (UF)" htmlFor="cpq-p-plan">
          <Input id="cpq-p-plan" inputMode="decimal" value={e.saludPlanUf} onChange={(x) => set({ saludPlanUf: x.target.value })} />
        </Campo>
      ) : null}
      <Campo etiqueta="Contrato" htmlFor="cpq-p-contrato">
        <Select id="cpq-p-contrato" valor={e.tipoContrato || SIN} onCambiar={(v) => pref("tipoContrato", v)}
          opciones={[opc(SIN, "Defecto de la empresa"), opc("indefinido", "Indefinido"), opc("plazo_fijo", "Plazo fijo")]} />
      </Campo>
    </div>
  );
}
