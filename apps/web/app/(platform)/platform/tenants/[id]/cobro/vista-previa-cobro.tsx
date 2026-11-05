"use client";

import {
  type Calculo,
  clp,
  type Condicion,
  enMoneda,
  type Moneda,
} from "../../../facturacion/_componentes/cobro";

export type Formulario = {
  moneda: Moneda;
  precio: string;
  cobroDesde: string;
  pruebaHasta: string;
  descuento: string;
  nota: string;
};

/** Valores del formulario desde la condición guardada (UF con coma decimal, como se escribe). */
export function formulario(c: Condicion | null): Formulario {
  if (!c)
    return { moneda: "CLP", precio: "", cobroDesde: "", pruebaHasta: "", descuento: "", nota: "" };
  return {
    moneda: c.moneda,
    precio:
      c.moneda === "UF"
        ? String(c.precioMensual / 10_000).replace(".", ",")
        : String(c.precioMensual),
    cobroDesde: c.cobroDesde ?? "",
    pruebaHasta: c.pruebaHasta ?? "",
    descuento: c.descuentoPct ? String(c.descuentoPct / 10_000).replace(".", ",") : "",
    nota: c.nota ?? "",
  };
}

/** Cómo queda el cobro del mes en curso con lo escrito (vista previa del servidor, sin guardar). */
export function VistaPreviaCobro(props: {
  calculo: Calculo | null;
  moneda: Moneda;
  pendiente: boolean;
  listo: boolean;
}) {
  const { calculo, moneda, pendiente, listo } = props;
  if (!listo)
    return (
      <p className="t-caption">
        Escribe el precio y el inicio del cobro o el fin de la prueba para ver el cobro de este mes.
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
