"use client";

import { Campo, Input, InputFecha, InputMonto, Segmentado } from "@opai/ds";

import type { Moneda } from "../../../facturacion/_componentes/cobro";
import type { Formulario } from "./vista-previa-cobro";

/** Campos de la condición comercial: moneda, precio, inicio del cobro, fin de la prueba, descuento y nota. */
export function CamposCondicion({
  f,
  setF,
}: {
  f: Formulario;
  setF: (cambio: (x: Formulario) => Formulario) => void;
}) {
  const fijar = (k: keyof Formulario) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const moneda = (m: Moneda) => () => setF((x) => ({ ...x, moneda: m, precio: "" }));
  return (
    <>
      <Segmentado
        etiqueta="Moneda"
        activa={f.moneda}
        opciones={[
          { id: "CLP", etiqueta: "Pesos (CLP)", onClick: moneda("CLP") },
          { id: "UF", etiqueta: "UF", onClick: moneda("UF") },
        ]}
      />
      <Campo
        etiqueta="Precio mensual"
        htmlFor="precio"
        ayuda={f.moneda === "UF" ? "Hasta 4 decimales, por ejemplo 2,5" : "Pesos, sin decimales"}
      >
        {f.moneda === "UF" ? (
          <Input
            id="precio"
            inputMode="decimal"
            value={f.precio}
            onChange={(e) => fijar("precio")(e.target.value)}
            placeholder="2,5"
          />
        ) : (
          <InputMonto
            id="precio"
            valor={f.precio}
            onCambiar={fijar("precio")}
            placeholder="250.000"
          />
        )}
      </Campo>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Inicio del cobro" htmlFor="desde" ayuda="Vacío: al terminar la prueba">
          <InputFecha id="desde" valor={f.cobroDesde} onCambiar={fijar("cobroDesde")} />
        </Campo>
        <Campo etiqueta="Fin de la prueba" htmlFor="prueba" ayuda="Opcional">
          <InputFecha id="prueba" valor={f.pruebaHasta} onCambiar={fijar("pruebaHasta")} />
        </Campo>
      </div>
      <Campo etiqueta="Descuento (%)" htmlFor="descuento" ayuda="Opcional, de 0 a 100">
        <Input
          id="descuento"
          inputMode="decimal"
          value={f.descuento}
          onChange={(e) => fijar("descuento")(e.target.value)}
          placeholder="0"
        />
      </Campo>
      <Campo
        etiqueta="Nota"
        htmlFor="nota"
        ayuda="Para el equipo de OPAI (por ejemplo, el acuerdo)"
      >
        <Input id="nota" value={f.nota} onChange={(e) => fijar("nota")(e.target.value)} />
      </Campo>
    </>
  );
}
