"use client";

import { Campo, Select } from "@opai/ds";

import { ETIQUETA_FORMA, type Hecho } from "../../_componentes/tipos";
import type { Borrador } from "./definicion";
import { nombreMonto } from "./textos";

type Props = { valor: Borrador; hechos: Hecho[]; onCambiar: (b: Borrador) => void };

const FORMAS = (Object.keys(ETIQUETA_FORMA) as Borrador["forma"][]).map((valor) => ({
  valor,
  etiqueta: ETIQUETA_FORMA[valor],
}));
const ETIQUETAS: Record<Borrador["forma"], [string, string]> = {
  contar: ["Qué se cuenta", ""],
  sumar: ["De qué hecho", ""],
  tiempo: ["Desde que pasa", "Hasta que pasa"],
  porcentaje: ["Cuántos de estos", "Sobre el total de estos"],
};
const UNIDADES = [
  { valor: "horas", etiqueta: "Horas" },
  { valor: "dias", etiqueta: "Días" },
];

/** Cómo se calcula el indicador: la forma y los hechos que usa (más monto o unidad según la forma). */
export function CamposDefinicion({ valor, hechos, onCambiar }: Props) {
  const opciones = hechos.map((h) => ({
    valor: h.id,
    etiqueta: h.nombre,
    descripcion: h.descripcion,
  }));
  const a = hechos.find((h) => h.id === valor.hechoA);
  // El segundo hecho se atribuye a la misma clase de sujeto; en «tiempo», además, es otro hecho de la
  // misma cosa (el mismo negocio, la misma solicitud).
  const paraB = opciones.filter((o) => {
    const h = hechos.find((x) => x.id === o.valor);
    if (!a || !h || h.sujeto !== a.sujeto) return !a;
    return valor.forma !== "tiempo" || (h.entidad === a.entidad && h.id !== a.id);
  });
  const sinAcceso = (id: string) =>
    id && !hechos.some((h) => h.id === id)
      ? { error: "Usa un hecho al que no tienes acceso: elige otro." }
      : {};
  const [etiquetaA, etiquetaB] = ETIQUETAS[valor.forma];
  const dos = valor.forma === "tiempo" || valor.forma === "porcentaje";
  return (
    <>
      <Campo etiqueta="Cómo se calcula" htmlFor="ip-forma">
        <Select
          id="ip-forma"
          valor={valor.forma}
          opciones={FORMAS}
          onCambiar={(forma) =>
            onCambiar({ ...valor, forma: forma as Borrador["forma"], hechoB: "", monto: "" })
          }
        />
      </Campo>
      <Campo etiqueta={etiquetaA} htmlFor="ip-hecho-a" {...sinAcceso(valor.hechoA)}>
        <Select
          id="ip-hecho-a"
          valor={valor.hechoA}
          placeholder="Elige un hecho"
          opciones={opciones}
          onCambiar={(hechoA) => onCambiar({ ...valor, hechoA, hechoB: "", monto: "" })}
        />
      </Campo>
      {valor.forma === "sumar" && a ? (
        <Campo
          etiqueta="Qué monto se suma"
          htmlFor="ip-monto"
          {...(a.montos.length === 0
            ? { ayuda: "Este hecho no tiene montos: elige otro o cambia la forma." }
            : {})}
        >
          <Select
            id="ip-monto"
            valor={valor.monto}
            placeholder="Elige un monto"
            opciones={a.montos.map((m) => ({ valor: m.id, etiqueta: nombreMonto(m.id, m.unidad) }))}
            onCambiar={(monto) => onCambiar({ ...valor, monto })}
          />
        </Campo>
      ) : null}
      {dos ? (
        <Campo etiqueta={etiquetaB} htmlFor="ip-hecho-b" {...sinAcceso(valor.hechoB)}>
          <Select
            id="ip-hecho-b"
            valor={valor.hechoB}
            placeholder="Elige un hecho"
            opciones={paraB}
            onCambiar={(hechoB) => onCambiar({ ...valor, hechoB })}
          />
        </Campo>
      ) : null}
      {valor.forma === "tiempo" ? (
        <Campo etiqueta="Se mide en" htmlFor="ip-unidad">
          <Select
            id="ip-unidad"
            valor={valor.unidad}
            opciones={UNIDADES}
            onCambiar={(unidad) => onCambiar({ ...valor, unidad: unidad as Borrador["unidad"] })}
          />
        </Campo>
      ) : null}
    </>
  );
}
