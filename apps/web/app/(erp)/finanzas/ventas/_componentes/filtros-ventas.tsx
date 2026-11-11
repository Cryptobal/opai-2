import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";

/** Filtros del libro de ventas por URL: período, tipo de documento y estado ante el SII. */
export function FiltrosVentas({ periodos }: { periodos: { valor: string; etiqueta: string }[] }) {
  return (
    <ChipsFiltro
      filtros={[
        { param: "periodo", etiqueta: "Período", opciones: periodos },
        {
          param: "tipo",
          etiqueta: "Tipo",
          opciones: [
            { valor: "33", etiqueta: "Facturas" },
            { valor: "34", etiqueta: "Facturas exentas" },
            { valor: "61", etiqueta: "Notas de crédito" },
            { valor: "56", etiqueta: "Notas de débito" },
          ],
        },
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: [
            { valor: "borrador", etiqueta: "Borradores" },
            { valor: "enviado", etiqueta: "Emitidas, sin respuesta del SII" },
            { valor: "aceptado", etiqueta: "Aceptadas" },
            { valor: "rechazado", etiqueta: "Rechazadas" },
            { valor: "anulado_nc", etiqueta: "Anuladas por nota de crédito" },
          ],
        },
      ]}
    />
  );
}
