"use client";

import type { UnidadCobro } from "@opai/domain";

import {
  type Calculo,
  clp,
  type Condicion,
  enMoneda,
  type Forma,
  type Moneda,
  type PrecioListaVista,
  textoCantidad,
} from "../../../facturacion/_componentes/cobro";

export type Formulario = {
  moneda: Moneda;
  forma: Forma;
  unidad: UnidadCobro | "";
  precio: string;
  minimo: string;
  cobroDesde: string;
  pruebaHasta: string;
  pasaACobro: boolean;
  descuento: string;
  nota: string;
};

const aTexto = (n: number, moneda: Moneda) =>
  moneda === "UF" ? String(n / 10_000).replace(".", ",") : String(n);

/**
 * Valores del formulario desde la condición guardada (UF con coma decimal, como se escribe). Sin
 * condición parte del precio de lista, si lo hay; el precio de la empresa siempre manda.
 */
export function formulario(c: Condicion | null, lista: PrecioListaVista | null = null): Formulario {
  if (!c)
    return {
      moneda: lista?.moneda ?? "UF",
      forma: lista?.forma ?? "fijo",
      unidad: lista?.unidad ?? "",
      precio: lista ? aTexto(lista.precio, lista.moneda) : "",
      minimo: lista?.minimoMensual ? aTexto(lista.minimoMensual, lista.moneda) : "",
      cobroDesde: "",
      pruebaHasta: "",
      pasaACobro: false,
      descuento: "",
      nota: "",
    };
  return {
    moneda: c.moneda,
    forma: c.forma,
    unidad: c.unidad ?? "",
    precio: aTexto(c.precio, c.moneda),
    minimo: c.minimoMensual ? aTexto(c.minimoMensual, c.moneda) : "",
    cobroDesde: c.cobroDesde ?? "",
    pruebaHasta: c.pruebaHasta ?? "",
    pasaACobro: c.pasaACobro,
    descuento: c.descuentoPct ? String(c.descuentoPct / 10_000).replace(".", ",") : "",
    nota: c.nota ?? "",
  };
}

/** Cómo queda el cobro del mes en curso con lo escrito (vista previa del servidor, sin guardar). */
export function VistaPreviaCobro(props: {
  calculo: Calculo | null;
  moneda: Moneda;
  unidad: UnidadCobro | null;
  pendiente: boolean;
  listo: boolean;
}) {
  const { calculo, moneda, unidad, pendiente, listo } = props;
  if (!listo)
    return (
      <p className="t-caption">
        Escribe el precio, la unidad si es por unidad, y el inicio del cobro o el fin de la prueba
        para ver el cobro de este mes.
      </p>
    );
  if (!calculo) return <p className="t-caption">{pendiente ? "Calculando…" : ""}</p>;
  return (
    <div
      className="flex flex-col gap-1 rounded-md border border-border bg-fill px-3 py-2.5"
      aria-live="polite"
    >
      <p className="t-label-sm text-fg-muted">Este mes</p>
      {calculo.facturable ? (
        <>
          <p className="t-numeric text-md font-semibold text-fg">
            {clp(calculo.montoClp)}
            {moneda === "UF" ? (
              <span className="t-caption"> · {enMoneda(calculo.monto, "UF")}</span>
            ) : null}
          </p>
          {calculo.cantidad !== null ? (
            <p className="t-caption">
              {calculo.cantidad === 1 ? "Hoy se cuenta" : "Hoy se cuentan"}{" "}
              {textoCantidad(calculo.cantidad, unidad)}; mes completo{" "}
              {enMoneda(calculo.mensual, moneda)}
            </p>
          ) : null}
          <p className="t-caption">
            {calculo.diasCobrados < calculo.diasMes
              ? `Proporcional: ${calculo.diasCobrados} de ${calculo.diasMes} días`
              : "Mes completo"}
          </p>
        </>
      ) : (
        <p className="text-base text-fg">No se factura: {calculo.motivoTexto.toLowerCase()}</p>
      )}
    </div>
  );
}
