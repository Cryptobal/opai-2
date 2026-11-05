"use client";

import { Campo, Checkbox, Input, InputFecha, InputMonto, Segmentado, Select } from "@opai/ds";
import { UNIDADES_COBRO, type UnidadCobro } from "@opai/domain";

import type { Forma, Moneda } from "../../../facturacion/_componentes/cobro";
import type { Formulario } from "./vista-previa-cobro";

/** Campos de la condición comercial: moneda, precio, inicio del cobro, fin de la prueba, descuento y nota. */
export function CamposCondicion({
  f,
  setF,
}: {
  f: Formulario;
  setF: (cambio: (x: Formulario) => Formulario) => void;
}) {
  const fijar =
    (
      k:
        | "moneda"
        | "unidad"
        | "precio"
        | "minimo"
        | "cobroDesde"
        | "pruebaHasta"
        | "descuento"
        | "nota",
    ) =>
    (v: string) =>
      setF((x) => ({ ...x, [k]: v }));
  const moneda = (m: Moneda) => () => setF((x) => ({ ...x, moneda: m, precio: "", minimo: "" }));
  const forma = (m: Forma) => () => setF((x) => ({ ...x, forma: m }));
  const unidades = (Object.keys(UNIDADES_COBRO) as UnidadCobro[]).map((u) => ({
    valor: u,
    etiqueta: UNIDADES_COBRO[u].singular,
  }));
  const monto = (id: "precio" | "minimo", placeholder: string) =>
    f.moneda === "UF" ? (
      <Input
        id={id}
        inputMode="decimal"
        value={f[id]}
        onChange={(e) => fijar(id)(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <InputMonto id={id} valor={f[id]} onCambiar={fijar(id)} placeholder="250.000" />
    );
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
      <Segmentado
        etiqueta="Forma de cobro"
        activa={f.forma}
        opciones={[
          { id: "fijo", etiqueta: "Precio fijo mensual", onClick: forma("fijo") },
          { id: "por_unidad", etiqueta: "Por unidad", onClick: forma("por_unidad") },
        ]}
      />
      {f.forma === "por_unidad" ? (
        <Campo
          etiqueta="Unidad que se cuenta"
          htmlFor="unidad"
          ayuda="Se cuenta al generar el cargo"
        >
          <Select
            id="unidad"
            valor={f.unidad || undefined}
            opciones={unidades}
            onCambiar={fijar("unidad")}
            placeholder="Elige la unidad"
          />
        </Campo>
      ) : null}
      <Campo
        etiqueta={f.forma === "por_unidad" ? "Precio por unidad" : "Precio mensual"}
        htmlFor="precio"
        ayuda={f.moneda === "UF" ? "Hasta 4 decimales, por ejemplo 2,5" : "Pesos, sin decimales"}
      >
        {monto("precio", "2,5")}
      </Campo>
      {f.forma === "por_unidad" ? (
        <Campo
          etiqueta="Mínimo mensual"
          htmlFor="minimo"
          ayuda="Opcional; se aplica antes del descuento"
        >
          {monto("minimo", "4")}
        </Campo>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Inicio del cobro" htmlFor="desde" ayuda="Vacío: al terminar la prueba">
          <InputFecha id="desde" valor={f.cobroDesde} onCambiar={fijar("cobroDesde")} />
        </Campo>
        <Campo etiqueta="Fin de la prueba" htmlFor="prueba" ayuda="Opcional">
          <InputFecha id="prueba" valor={f.pruebaHasta} onCambiar={fijar("pruebaHasta")} />
        </Campo>
      </div>
      <Checkbox
        marcado={f.pasaACobro}
        onCambiar={(v) => setF((x) => ({ ...x, pasaACobro: v }))}
        etiqueta="Pasa a cobro al vencer la prueba"
        descripcion="Sin marcar, al vencer el módulo queda en solo lectura."
      />
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
